import { assert } from '@core/Assert';
import { log } from '@core/Logger';

export interface StateContext {
  readonly time: number;
  readonly delta: number;
}

export interface State<TOwner, TStateId extends string> {
  readonly id: TStateId;
  enter?(owner: TOwner, ctx: StateContext, from?: TStateId): void;
  exit?(owner: TOwner, ctx: StateContext, to: TStateId): void;
  update(owner: TOwner, ctx: StateContext): TStateId | undefined;
  readonly allowed: readonly TStateId[];
  readonly interrupt?: boolean;
}

const HISTORY_CAPACITY = 16;

export class StateMachine<TOwner, TStateId extends string> {
  private current: State<TOwner, TStateId>;
  private timeInStateMs = 0;
  private readonly states: ReadonlyMap<TStateId, State<TOwner, TStateId>>;
  private readonly historyRing: TStateId[] = [];
  private historyWrite = 0;
  private historyCount = 0;

  constructor(
    private readonly owner: TOwner,
    states: readonly State<TOwner, TStateId>[],
    initial: TStateId,
  ) {
    const map = new Map<TStateId, State<TOwner, TStateId>>();
    for (const s of states) {
      if (map.has(s.id)) throw new Error(`Duplicate state id: ${s.id}`);
      map.set(s.id, s);
    }
    const start = map.get(initial);
    if (start === undefined) throw new Error(`Unknown initial state: ${initial}`);
    this.states = map;
    this.current = start;
    this.recordHistory(initial);
    start.enter?.(this.owner, { time: 0, delta: 0 }, undefined);
  }

  update(ctx: StateContext): void {
    this.timeInStateMs += ctx.delta;
    const next = this.current.update(this.owner, ctx);
    if (next !== undefined && next !== this.current.id) {
      this.transitionTo(next, ctx, false);
    }
  }

  force(to: TStateId, ctx: StateContext): void {
    if (to === this.current.id) return;
    const target = this.states.get(to);
    if (target === undefined) throw new Error(`Unknown state: ${to}`);
    this.transitionTo(to, ctx, true);
  }

  get id(): TStateId {
    return this.current.id;
  }

  get timeInState(): number {
    return this.timeInStateMs;
  }

  getHistory(): readonly TStateId[] {
    const out: TStateId[] = [];
    const count = this.historyCount;
    for (let i = 0; i < count; i++) {
      const idx = (this.historyWrite - count + i + HISTORY_CAPACITY) % HISTORY_CAPACITY;
      out.push(this.historyRing[idx]!);
    }
    return out;
  }

  private transitionTo(to: TStateId, ctx: StateContext, bypassAllowed: boolean): void {
    const target = this.states.get(to);
    if (target === undefined) throw new Error(`Unknown state: ${to}`);

    if (!bypassAllowed && !this.current.allowed.includes(to)) {
      const msg = `Transition ${this.current.id} → ${to} is not allowed`;
      if (import.meta.env.DEV) {
        assert(false, msg);
      } else {
        log.warn('StateMachine', msg);
        return;
      }
    }

    const from = this.current.id;
    this.current.exit?.(this.owner, ctx, to);
    this.current = target;
    this.timeInStateMs = 0;
    this.recordHistory(to);
    target.enter?.(this.owner, ctx, from);
  }

  private recordHistory(id: TStateId): void {
    this.historyRing[this.historyWrite] = id;
    this.historyWrite = (this.historyWrite + 1) % HISTORY_CAPACITY;
    if (this.historyCount < HISTORY_CAPACITY) this.historyCount += 1;
  }
}
