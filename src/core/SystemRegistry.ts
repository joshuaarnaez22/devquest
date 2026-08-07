export type SystemId = string;

export interface System {
  readonly id: SystemId;
  enabled: boolean;
  readonly runsWhilePaused?: boolean;
  init?(): void;
  update?(time: number, delta: number): void;
  postPhysics?(time: number, delta: number): void;
  destroy?(): void;
}

export class SystemRegistry {
  private readonly systems: System[] = [];
  private readonly byId = new Map<SystemId, System>();
  private paused = false;

  constructor(systems: readonly System[], order: readonly SystemId[]) {
    const lookup = new Map(systems.map(s => [s.id, s]));
    for (const id of order) {
      const sys = lookup.get(id);
      if (sys === undefined) throw new Error(`Unknown system in order: ${id}`);
      this.systems.push(sys);
      this.byId.set(id, sys);
    }
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  init(): void {
    for (const s of this.systems) {
      s.init?.();
    }
  }

  update(time: number, delta: number): void {
    for (const s of this.systems) {
      if (!s.enabled) continue;
      if (this.paused && !s.runsWhilePaused) continue;
      s.update?.(time, delta);
    }
  }

  postPhysics(time: number, delta: number): void {
    for (const s of this.systems) {
      if (!s.enabled) continue;
      if (this.paused && !s.runsWhilePaused) continue;
      s.postPhysics?.(time, delta);
    }
  }

  destroy(): void {
    for (let i = this.systems.length - 1; i >= 0; i--) {
      this.systems[i]!.destroy?.();
    }
    this.systems.length = 0;
    this.byId.clear();
  }

  get<T extends System>(id: SystemId): T {
    const sys = this.byId.get(id);
    if (sys === undefined) throw new Error(`System not registered: ${id}`);
    return sys as T;
  }
}
