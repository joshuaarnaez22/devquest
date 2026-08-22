import type { EntityId } from '@core/GameEvents';
import type { Ability, AbilityContext } from '@entities/player/abilities/Ability';

/**
 * Knight — Guard (docs/06 §7.1.4). Hardcoded per ADR-004 — a JSON `abilityConfig`
 * schema is M4's job once a second ability-bearing hero framework exists to
 * generalise from.
 *
 * `PARRY_STAGGER_MS` (800ms) is the documented attacker-stagger duration, but the
 * only enemy that exists (Skeleton) has a FIXED 220ms `HURT` duration (§8.2) —
 * there is no per-hit-duration stagger support on `Skeleton` yet, and building
 * one now for a single interaction would be premature. The parry still forces
 * the attacker into `HURT` (a real, felt stagger); it is shorter than the doc's
 * number until a second enemy makes a variable-duration stagger worth building.
 * Flag if a future session wants this exact.
 */
const DAMAGE_REDUCTION = 0.75;
const KNOCKBACK_REDUCTION = 0.9;
const GUARD_MOVE_SPEED = 25;
const PARRY_WINDOW_MS = 200;
const PARRY_HITSTOP_MS = 140;
const GUARD_BREAK_HITS = 3;
const GUARD_BREAK_WINDOW_MS = 2000;
const GUARD_BREAK_STUN_MS = 500;

export class KnightGuard implements Ability {
  readonly id = 'knight_guard' as const;

  private guarding = false;
  private guardStartedAt = 0;
  private blockedHitTimes: number[] = [];
  private guardBrokenUntil = -Infinity;
  private pendingCritical = false;
  private lastParryAttacker: EntityId | null = null;

  init(): void {
    this.guarding = false;
    this.blockedHitTimes = [];
    this.guardBrokenUntil = -Infinity;
    this.pendingCritical = false;
  }

  /** Instant activation, no windup (§7.1.4) — only gated by not being mid-guard-break stun. */
  canActivate(ctx: AbilityContext): boolean {
    return ctx.frame.specialHeld && ctx.time >= this.guardBrokenUntil;
  }

  onActivate(ctx: AbilityContext): 'hold' | 'complete' {
    this.guarding = true;
    this.guardStartedAt = ctx.time;
    return 'hold';
  }

  /** Held as long as Special stays held and the guard hasn't just broken. */
  update(ctx: AbilityContext): 'hold' | 'complete' {
    const body = ctx.player.body as Phaser.Physics.Arcade.Body;
    if (ctx.time < this.guardBrokenUntil) return 'complete';
    if (!ctx.frame.specialHeld) return 'complete';
    // Direction-locked shuffle (§7.1.4) — facing itself is set by the FSM's own
    // moveX handling elsewhere; Guard only overrides speed, not turning.
    body.setVelocityX(ctx.player.facingDir * GUARD_MOVE_SPEED);
    return 'hold';
  }

  onDeactivate(): void {
    this.guarding = false;
  }

  /** Every frame regardless of state — decays the guard-break window and consumes
   * the post-parry critical flag onto the player's next queued attack. */
  passiveUpdate(ctx: AbilityContext): void {
    this.blockedHitTimes = this.blockedHitTimes.filter(t => ctx.time - t < GUARD_BREAK_WINDOW_MS);
    if (this.pendingCritical) {
      ctx.player.abilitySlot.markNextAttackCritical();
      this.pendingCritical = false;
    }
  }

  /**
   * §7.1.4 — 75%/90% reduction from the front while guarding (0% from behind or
   * not guarding), and a parry if the hit lands within the first 200ms.
   */
  onIncomingDamage(
    ctx: AbilityContext,
    damage: number,
    source: EntityId,
    fromBehind: boolean,
  ): number {
    // Reset every hit — `computeKnockback` reads this synchronously right after
    // this call returns, so it must only stay elevated for the hit that earned it.
    ctx.player.knockbackResist = 0;
    if (!this.guarding || fromBehind) return damage;

    if (ctx.time - this.guardStartedAt <= PARRY_WINDOW_MS) {
      this.pendingCritical = true;
      this.lastParryAttacker = source;
      ctx.bus.emit('ability:parried', {
        attacker: source,
        victim: ctx.player.id,
        hitstopMs: PARRY_HITSTOP_MS,
      });
      return 0;
    }

    this.blockedHitTimes.push(ctx.time);
    ctx.player.knockbackResist = KNOCKBACK_REDUCTION;
    if (this.blockedHitTimes.length >= GUARD_BREAK_HITS) {
      this.guardBrokenUntil = ctx.time + GUARD_BREAK_STUN_MS;
      this.blockedHitTimes = [];
    }
    return damage * (1 - DAMAGE_REDUCTION);
  }

  /** Last enemy this Guard parried — read-only, for tests/debug. */
  get lastParried(): EntityId | null {
    return this.lastParryAttacker;
  }

  readiness(): number {
    return 1; // no cooldown (§7.1.4)
  }
}
