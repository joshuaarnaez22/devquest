import type { EventBus } from '@core/EventBus';
import type { EntityId, GameEventMap } from '@core/GameEvents';
import type { InputFrame } from '@core/InputFrame';
import type { AbilityContext, AbilityTarget, Ability } from '@entities/player/abilities/Ability';
import type { FeelPlayer } from '@entities/player/FeelPlayer';
import type { HitQueue } from '@systems/HitQueue';
import type { VfxSystem } from '@systems/VfxSystem';

/** The externally-owned systems an `Ability` needs — set once from `GameScene`,
 * after the Skeleton/HitQueue/VfxSystem all exist (which is after `FeelPlayer`
 * itself is constructed, hence a separate `setDeps` rather than a constructor arg). */
export interface AbilityDeps {
  readonly hitQueue: HitQueue;
  readonly vfx: VfxSystem;
  readonly isSolidAt: (x: number, y: number) => boolean;
  readonly getTargets: () => readonly AbilityTarget[];
}

/**
 * `FeelPlayer`'s hero-ability integration — split into its own file (M2-T11, same
 * file-length reasoning as `PlayerDamage.ts`/`PlayerJump.ts`) rather than inlined.
 * Owns the current `Ability` instance and assembles its `AbilityContext` each
 * frame from a cheap `sync()` snapshot of frame/time/delta.
 */
export class PlayerAbilitySlot {
  private ability: Ability | null = null;
  private deps: AbilityDeps | null = null;
  private initialized = false;
  private specialComplete = false;
  private pendingCritical = false;
  private current: { frame: InputFrame; time: number; delta: number } | null = null;

  constructor(
    private readonly player: FeelPlayer,
    private readonly bus: EventBus<GameEventMap>,
  ) {}

  /** `GameScene.create()` calls `player.setCharacter(...)` (needs to run before
   * `buildCombatVictims` reads `player.health`/`armour`/etc.) before the
   * Skeleton/HitQueue/VfxSystem exist to build `AbilityDeps` from — so the very
   * first `setAbility` call unavoidably has no deps yet and its `init` is a
   * no-op. Deps arriving here later runs the deferred `init` for real. */
  setDeps(deps: AbilityDeps): void {
    this.deps = deps;
    if (this.ability !== null && !this.initialized) {
      const ctx = this.context();
      if (ctx !== null) {
        this.ability.init(ctx);
        this.initialized = true;
      }
    }
  }

  /** Hot-swap on `FeelPlayer.setCharacter` (F1–F4). Unsubscribes the outgoing
   * ability's own bus listeners (e.g. `SamuraiIai`'s kill-refund) — each ability
   * subscribes with itself as the `EventBus` context in `init`, so this is a
   * plain `offAllFor(oldAbility)`, no per-ability teardown method needed. */
  setAbility(ability: Ability): void {
    if (this.ability !== null) this.bus.offAllFor(this.ability);
    this.ability = ability;
    this.initialized = false;
    const ctx = this.context();
    if (ctx !== null) {
      ability.init(ctx);
      this.initialized = true;
    }
  }

  /** Call once at the top of `onUpdate` and again in `syncAfterPhysics` — cheap, no allocation beyond this tiny struct. */
  sync(frame: InputFrame, time: number, delta: number): void {
    this.current = { frame, time, delta };
  }

  private context(): AbilityContext | null {
    if (this.deps === null || this.current === null) return null;
    return {
      player: this.player,
      frame: this.current.frame,
      time: this.current.time,
      delta: this.current.delta,
      bus: this.bus,
      hitQueue: this.deps.hitQueue,
      vfx: this.deps.vfx,
      isSolidAt: this.deps.isSolidAt,
      getTargets: this.deps.getTargets,
    };
  }

  get specialReady(): boolean {
    const ctx = this.context();
    if (ctx === null || this.ability === null) return false;
    return this.ability.canActivate(ctx);
  }

  /** Pre-physics: runs every frame the FSM is already in `SPECIAL`, so the
   * ability can drive movement (e.g. Guard's shuffle) before the physics step. */
  tickActive(): void {
    const ctx = this.context();
    if (ctx === null || this.ability === null) return;
    this.specialComplete = this.ability.update(ctx) === 'complete';
  }

  /** Every frame, regardless of state (mana regen, guard-break decay). */
  tickPassive(): void {
    const ctx = this.context();
    if (ctx === null || this.ability?.passiveUpdate === undefined) return;
    this.ability.passiveUpdate(ctx);
  }

  /** Feeds `PlayerFsmHost.animComplete` while the FSM is in `SPECIAL`. */
  get isComplete(): boolean {
    return this.specialComplete;
  }

  /** Post-tick: the frame the FSM entered `SPECIAL`. */
  onEnter(): void {
    const ctx = this.context();
    if (ctx === null || this.ability === null) return;
    this.specialComplete = this.ability.onActivate(ctx) === 'complete';
  }

  /** Post-tick: the frame the FSM left `SPECIAL`. */
  onExit(reason: 'complete' | 'damaged' | 'cancelled'): void {
    const ctx = this.context();
    if (ctx === null || this.ability === null) return;
    this.ability.onDeactivate(ctx, reason);
  }

  /** `CombatVictim.onIncomingDamage` — Knight's Guard/parry. */
  interceptDamage(damage: number, source: EntityId, fromBehind: boolean): number {
    const ctx = this.context();
    if (ctx === null || this.ability?.onIncomingDamage === undefined) return damage;
    return this.ability.onIncomingDamage(ctx, damage, source, fromBehind);
  }

  readiness(): number {
    const ctx = this.context();
    if (ctx === null || this.ability === null) return 1;
    return this.ability.readiness(ctx);
  }

  /** Knight's parry-critical (docs/06 §7.1.4) — not part of the `Ability`
   * interface (no hook exists for "modify my own next outgoing hit"), so it's
   * plain player-adjacent state here instead. Set by `KnightGuard` via
   * `ctx.player.abilitySlot`, consumed once by `GameCombatWiring` per queued hit. */
  markNextAttackCritical(): void {
    this.pendingCritical = true;
  }

  consumeNextAttackCritical(): boolean {
    const v = this.pendingCritical;
    this.pendingCritical = false;
    return v;
  }
}
