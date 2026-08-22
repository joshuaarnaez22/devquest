import { Hitbox } from '@components/Hitbox';
import type { Ability, AbilityContext } from '@entities/player/abilities/Ability';

/**
 * Wizard — Arcane Nova / Barrier (docs/06 §7.4.4/§7.4.5). Hardcoded per ADR-004.
 * Tap Special → Nova (radial burst); still holding past `HOLD_THRESHOLD_MS` →
 * Barrier instead, activating immediately at that threshold rather than waiting
 * for release.
 *
 * **Deferred, flagged:** a barrier BREAK (absorption cap hit) is documented as
 * "400ms HURT-equivalent stagger, no damage taken" — a health-neutral stagger
 * distinct from the normal damage->HURT path has no seam in `PlayerStates.ts`
 * today (that FSM's only stagger trigger is `damaged`, which always implies
 * health loss). Breaking the barrier here exits `SPECIAL` and pays the 1200ms
 * cooldown, but does not force a stagger — flag if this needs to be exact.
 * "Blocks all projectiles entirely" is also not modelled — no projectile system
 * exists yet (Wizard's own basic ranged attack is M2-T13+ scope, not this task).
 */
const HOLD_THRESHOLD_MS = 400;
const NOVA_WINDUP_MS = 250;
const NOVA_MANA_COST = 40;
const NOVA_RADIUS = 56;
const NOVA_DAMAGE = 28;
const NOVA_KNOCKBACK = 160;
const NOVA_KNOCKBACK_LIFT = -40;
const NOVA_HITSTOP_MS = 140;
const NOVA_COOLDOWN_MS = 900;
const NOVA_IFRAME_MS = 200;

const BARRIER_CAST_COST = 25;
const BARRIER_SUSTAIN_PER_SEC = 12;
const BARRIER_CAP = 40;
const BARRIER_MOVE_SPEED = 50;
const BARRIER_COOLDOWN_MS = 1200;

const MANA_MAX = 100;
const MANA_REGEN_PER_SEC = 18;
const MANA_REGEN_DELAY_MS = 500;
const MANA_ON_KILL = 15;

type Phase = 'undecided' | 'novaWindup' | 'barrier';

export class WizardNova implements Ability {
  readonly id = 'wizard_nova' as const;

  private mana = MANA_MAX;
  private lastSpendAt = -Infinity;
  private phase: Phase = 'undecided';
  private activatedAt = 0;
  private barrierAbsorbed = 0;
  private novaCooldownUntil = -Infinity;
  private barrierCooldownUntil = -Infinity;
  private readonly hitbox = new Hitbox();

  init(ctx: AbilityContext): void {
    this.mana = MANA_MAX;
    this.lastSpendAt = -Infinity;
    this.novaCooldownUntil = -Infinity;
    this.barrierCooldownUntil = -Infinity;
    const playerId = ctx.player.id;
    ctx.bus.on(
      'combat:kill',
      p => {
        if (p.killer === playerId) this.spendMana(-MANA_ON_KILL, Number.NEGATIVE_INFINITY);
      },
      this,
    );
  }

  canActivate(ctx: AbilityContext): boolean {
    return (
      ctx.time >= this.novaCooldownUntil &&
      ctx.time >= this.barrierCooldownUntil &&
      this.mana >= NOVA_MANA_COST
    );
  }

  onActivate(ctx: AbilityContext): 'hold' | 'complete' {
    this.phase = 'undecided';
    this.activatedAt = ctx.time;
    return 'hold';
  }

  update(ctx: AbilityContext): 'hold' | 'complete' {
    if (this.phase === 'undecided') return this.tickUndecided(ctx);
    if (this.phase === 'novaWindup') return this.tickNovaWindup(ctx);
    return this.tickBarrier(ctx);
  }

  private tickUndecided(ctx: AbilityContext): 'hold' | 'complete' {
    if (ctx.time - this.activatedAt >= HOLD_THRESHOLD_MS && ctx.frame.specialHeld) {
      if (this.mana < BARRIER_CAST_COST) return 'complete';
      this.phase = 'barrier';
      this.barrierAbsorbed = 0;
      this.spendMana(BARRIER_CAST_COST, ctx.time);
      return 'hold';
    }
    if (!ctx.frame.specialHeld) {
      this.phase = 'novaWindup';
      this.activatedAt = ctx.time;
      return 'hold';
    }
    return 'hold';
  }

  private tickNovaWindup(ctx: AbilityContext): 'hold' | 'complete' {
    const body = ctx.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(0);
    if (ctx.time - this.activatedAt < NOVA_WINDUP_MS) return 'hold';

    this.fireNova(ctx);
    return 'complete';
  }

  private fireNova(ctx: AbilityContext): void {
    this.spendMana(NOVA_MANA_COST, ctx.time);
    this.novaCooldownUntil = ctx.time + NOVA_COOLDOWN_MS;
    ctx.player.damage.iFrames.grant(NOVA_IFRAME_MS, ctx.time);

    this.hitbox.schedule(ctx.time, 0, 1000, {
      width: NOVA_RADIUS * 2,
      height: NOVA_RADIUS * 2,
      offsetX: 0,
      offsetY: 0,
    });
    this.hitbox.update(ctx.time);

    const cx = ctx.player.x;
    const cy = ctx.player.y;
    for (const target of ctx.getTargets()) {
      if (!target.active || !this.hitbox.canHit(target.id)) continue;
      const dx = target.x - cx;
      const dy = target.y - cy;
      if (Math.hypot(dx, dy) > NOVA_RADIUS) continue;
      this.hitbox.markHit(target.id);
      ctx.hitQueue.queue({
        hitbox: this.hitbox,
        attackerId: ctx.player.id,
        victimId: target.id,
        point: { x: target.x, y: target.y },
        source: 'melee',
        step: {
          index: 1,
          windupMs: 0,
          activeMs: 1,
          recoveryMs: 0,
          damage: NOVA_DAMAGE,
          rangeX: NOVA_RADIUS,
          rangeY: NOVA_RADIUS,
          offsetX: 0,
          offsetY: 0,
          hitKind: 'magic',
          knockback: NOVA_KNOCKBACK,
          knockbackLift: NOVA_KNOCKBACK_LIFT,
          arcDegrees: 180,
          comboWindowMs: 0,
          vfxAngleDeg: 0,
        },
      });
    }
    void NOVA_HITSTOP_MS; // carried by HIT_TIERS.magic's own hitStopMs, not overridden per-step
  }

  private tickBarrier(ctx: AbilityContext): 'hold' | 'complete' {
    const body = ctx.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(ctx.frame.moveX * BARRIER_MOVE_SPEED);
    this.spendMana((BARRIER_SUSTAIN_PER_SEC * ctx.delta) / 1000, ctx.time);

    if (this.mana <= 0 || !ctx.frame.specialHeld) {
      this.barrierCooldownUntil = ctx.time + BARRIER_COOLDOWN_MS;
      return 'complete';
    }
    return 'hold';
  }

  /** `CombatVictim.onIncomingDamage` — Barrier absorption (§7.4.4). */
  onIncomingDamage(ctx: AbilityContext, damage: number): number {
    if (this.phase !== 'barrier') return damage;
    this.barrierAbsorbed += damage;
    if (this.barrierAbsorbed >= BARRIER_CAP) {
      this.barrierCooldownUntil = ctx.time + BARRIER_COOLDOWN_MS;
      this.phase = 'undecided'; // forces `update()` to exit next tick via the undecided branch's fall-through
    }
    return 0;
  }

  onDeactivate(_ctx: AbilityContext, reason: 'complete' | 'damaged' | 'cancelled'): void {
    if (reason === 'damaged' && this.phase === 'novaWindup') {
      // Windup cancelled by damage (§7.4.4) — no mana was spent yet, nothing to refund.
      this.phase = 'undecided';
    }
  }

  /** Mana regen: 18/s, always, after a 500ms delay from the last spend (§7.4.5). */
  passiveUpdate(ctx: AbilityContext): void {
    if (ctx.time - this.lastSpendAt < MANA_REGEN_DELAY_MS) return;
    this.mana = Math.min(MANA_MAX, this.mana + (MANA_REGEN_PER_SEC * ctx.delta) / 1000);
  }

  private spendMana(amount: number, spentAt: number): void {
    this.mana = Math.max(0, Math.min(MANA_MAX, this.mana - amount));
    if (amount > 0) this.lastSpendAt = spentAt;
  }

  readiness(ctx: AbilityContext): number {
    if (this.mana < NOVA_MANA_COST) return this.mana / NOVA_MANA_COST;
    const remaining = Math.max(this.novaCooldownUntil, this.barrierCooldownUntil) - ctx.time;
    return remaining <= 0 ? 1 : 1 - remaining / NOVA_COOLDOWN_MS;
  }

  /** Read-only — for tests/debug/HUD. */
  get manaValue(): number {
    return this.mana;
  }
}
