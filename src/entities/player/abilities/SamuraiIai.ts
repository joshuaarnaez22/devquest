import { aabbOverlap } from '@components/Box';
import { Hitbox } from '@components/Hitbox';
import type { Ability, AbilityContext } from '@entities/player/abilities/Ability';

/**
 * Samurai — Iai Slash (docs/06 §7.2.4). Hardcoded per ADR-004. Hit dedup reuses
 * the standard `Hitbox` (`schedule` once at slash-start bumps its instance,
 * `canHit`/`markHit` per target) — the exact same mechanism every other attack
 * uses, rather than a bespoke per-ability dedup set.
 */
const CHARGE_THRESHOLD_MS = 600;
const QUICK = { distance: 48, speed: 480, damage: 30, hitStopMs: 110, killRefundMs: 400 };
const CHARGED = { distance: 88, speed: 620, damage: 55, hitStopMs: 140, killRefundMs: 700 };
const CHARGED_IFRAME_TAIL_MS = 100;
const COOLDOWN_MS = 1400;
const HITBOX_W = 20;
const HITBOX_H = 24;

type Phase = 'charging' | 'slashing';
type SlashSpec = typeof QUICK;

export class SamuraiIai implements Ability {
  readonly id = 'samurai_iai' as const;

  private phase: Phase = 'charging';
  private activatedAt = 0;
  private travelled = 0;
  private dir: -1 | 1 = 1;
  private spec: SlashSpec = QUICK;
  private readonly hitbox = new Hitbox();
  private cooldownUntil = -Infinity;

  init(ctx: AbilityContext): void {
    this.cooldownUntil = -Infinity;
    // Kill refund (§7.2.4) — self-subscribed so no external wiring is needed.
    const playerId = ctx.player.id;
    ctx.bus.on(
      'combat:kill',
      p => {
        if (p.killer === playerId) this.onKillDuringSlash();
      },
      this,
    );
  }

  canActivate(ctx: AbilityContext): boolean {
    return ctx.time >= this.cooldownUntil;
  }

  onActivate(ctx: AbilityContext): 'hold' | 'complete' {
    this.phase = 'charging';
    this.activatedAt = ctx.time;
    this.dir = ctx.frame.moveX !== 0 ? (ctx.frame.moveX as -1 | 1) : ctx.player.facingDir;
    return 'hold';
  }

  update(ctx: AbilityContext): 'hold' | 'complete' {
    return this.phase === 'charging' ? this.tickCharging(ctx) : this.tickSlashing(ctx);
  }

  private tickCharging(ctx: AbilityContext): 'hold' | 'complete' {
    const held = ctx.time - this.activatedAt;
    if (held >= CHARGE_THRESHOLD_MS) {
      // Charge secured — i-frames start here, through the slash + tail (§7.2.4).
      ctx.player.damage.iFrames.grant(200, ctx.time);
    }
    if (ctx.frame.specialHeld) return 'hold';

    this.spec = held >= CHARGE_THRESHOLD_MS ? CHARGED : QUICK;
    if (this.spec === CHARGED) {
      const travelMs = (this.spec.distance / this.spec.speed) * 1000;
      ctx.player.damage.iFrames.grant(travelMs + CHARGED_IFRAME_TAIL_MS, ctx.time);
    }
    this.beginSlash(ctx);
    return 'hold';
  }

  private beginSlash(ctx: AbilityContext): void {
    this.phase = 'slashing';
    this.travelled = 0;
    this.hitbox.schedule(ctx.time, 0, this.spec.distance * 100, {
      width: HITBOX_W,
      height: HITBOX_H,
      offsetX: 0,
      offsetY: -HITBOX_H / 2,
    });
    this.cooldownUntil = ctx.time + COOLDOWN_MS;
  }

  private tickSlashing(ctx: AbilityContext): 'hold' | 'complete' {
    const body = ctx.player.body as Phaser.Physics.Arcade.Body;
    const stepPx = (this.spec.speed * ctx.delta) / 1000;
    const remaining = this.spec.distance - this.travelled;
    const move = Math.min(stepPx, Math.max(0, remaining));
    body.setVelocityX(this.dir * this.spec.speed);
    body.setVelocityY(0);
    this.travelled += move;

    this.hitbox.update(ctx.time);
    this.queueOverlaps(ctx);

    if (this.travelled >= this.spec.distance) {
      body.setVelocityX(0);
      return 'complete';
    }
    return 'hold';
  }

  private queueOverlaps(ctx: AbilityContext): void {
    const hb = this.hitbox.rect(ctx.player.x, ctx.player.y, this.dir);
    for (const target of ctx.getTargets()) {
      if (!target.active || !this.hitbox.canHit(target.id)) continue;
      const hurt = target.hurtbox.rect(target.x, target.y, target.facingDir);
      if (!aabbOverlap(hb, hurt)) continue;
      this.hitbox.markHit(target.id);
      ctx.hitQueue.queue({
        hitbox: this.hitbox,
        attackerId: ctx.player.id,
        victimId: target.id,
        point: { x: hurt.x + hurt.width / 2, y: hurt.y + hurt.height / 2 },
        source: 'melee',
        step: {
          index: 1,
          windupMs: 0,
          activeMs: 1,
          recoveryMs: 0,
          damage: this.spec.damage,
          rangeX: HITBOX_W,
          rangeY: HITBOX_H,
          offsetX: 0,
          offsetY: 0,
          hitKind: 'heavy',
          knockback: 100,
          knockbackLift: -30,
          arcDegrees: 0,
          comboWindowMs: 0,
          vfxAngleDeg: 0,
        },
      });
    }
  }

  onDeactivate(_ctx: AbilityContext, reason: 'complete' | 'damaged' | 'cancelled'): void {
    if (this.phase === 'charging' && reason === 'damaged') {
      // Interrupted mid-charge — refund the cooldown (never spent it, §7.2.4).
      this.cooldownUntil = -Infinity;
    }
  }

  passiveUpdate(): void {}

  readiness(ctx: AbilityContext): number {
    const remaining = this.cooldownUntil - ctx.time;
    return remaining <= 0 ? 1 : 1 - remaining / COOLDOWN_MS;
  }

  /** `combat:kill` listener (wired externally) — kill refund (§7.2.4). */
  onKillDuringSlash(): void {
    if (this.phase !== 'slashing') return;
    this.cooldownUntil -= this.spec.killRefundMs;
  }
}
