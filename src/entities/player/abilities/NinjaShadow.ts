import type { Ability, AbilityContext } from '@entities/player/abilities/Ability';

/**
 * Ninja — Shadow Step (docs/06 §7.3.4). Hardcoded per ADR-004. The two passives
 * (double jump, i-frame dash) are already live via `NINJA_MOVEMENT` (M1) — this
 * is only the active teleport.
 *
 * **Deferred, flagged:** the decoy is a visual marker only — "enemies within 96px
 * retarget to it" needs an enemy-targeting-priority system (nothing chooses a
 * target today; `Skeleton`'s `TargetSource` is hardcoded to the real player in
 * `GameScene`) and "explodes for 18 damage if hit" needs the decoy to be a real
 * hittable entity with its own hurtbox, which means extending the two-entity
 * (player, one enemy) overlap detection in `GameCombatWiring.ts` to a third
 * participant. Both are real infrastructure, not a few lines — out of scope
 * for the one-enemy fight this milestone actually has to prove. Flag if a
 * second enemy/targeting session wants this built out.
 */
const TELEPORT_DISTANCE = 64;
const WALL_SAMPLES = 8;
/** Matches `LedgeSensor`'s `DEFAULT_LEDGE_SENSOR_CONFIG.wallProbeY` (docs/08 §5.6). */
const WALL_PROBE_Y_OFFSET = -8;
const DECOY_LIFETIME_MS = 1200;
const IFRAME_MS = 200;
const COOLDOWN_MS = 3000;

export class NinjaShadow implements Ability {
  readonly id = 'ninja_shadow' as const;

  private cooldownUntil = -Infinity;
  private decoy: { x: number; y: number; expiresAt: number } | null = null;

  init(): void {
    this.cooldownUntil = -Infinity;
    this.decoy = null;
  }

  canActivate(ctx: AbilityContext): boolean {
    return ctx.time >= this.cooldownUntil;
  }

  onActivate(ctx: AbilityContext): 'hold' | 'complete' {
    const dir = ctx.frame.moveX !== 0 ? (ctx.frame.moveX as -1 | 1) : ctx.player.facingDir;
    const originX = ctx.player.x;
    const destX = this.findValidDestination(ctx, originX, dir);

    this.decoy = { x: originX, y: ctx.player.y, expiresAt: ctx.time + DECOY_LIFETIME_MS };

    const body = ctx.player.body as Phaser.Physics.Arcade.Body;
    body.x = destX - body.halfWidth;
    ctx.player.damage.iFrames.grant(IFRAME_MS, ctx.time);
    ctx.player.restoreAirMobility();

    this.cooldownUntil = ctx.time + COOLDOWN_MS;
    return 'complete'; // instant — no travel time (§7.3.4)
  }

  /**
   * Samples up to 8 points walking back from the full 64px toward the player,
   * cancelling to the origin if every sample is solid (§7.3.4's "8 samples then
   * cancel", the hard part called out in the plan). Probes above foot level, same
   * convention as `LedgeSensor`'s `wallProbeY` (docs/08 §5.6) — flat ground sits
   * exactly at/below foot level, so a point probe at the raw foot Y is solid on
   * ANY ground the player is standing on, indistinguishable from a real wall.
   */
  private findValidDestination(ctx: AbilityContext, originX: number, dir: -1 | 1): number {
    const probeY = ctx.player.y + WALL_PROBE_Y_OFFSET;
    for (let i = WALL_SAMPLES; i >= 1; i--) {
      const candidate = originX + dir * ((TELEPORT_DISTANCE * i) / WALL_SAMPLES);
      if (!ctx.isSolidAt(candidate, probeY)) return candidate;
    }
    return originX; // every sample blocked — cancel in place
  }

  update(): 'hold' | 'complete' {
    return 'complete';
  }

  onDeactivate(): void {}

  passiveUpdate(ctx: AbilityContext): void {
    if (this.decoy !== null && ctx.time >= this.decoy.expiresAt) {
      this.decoy = null;
    }
  }

  readiness(ctx: AbilityContext): number {
    const remaining = this.cooldownUntil - ctx.time;
    return remaining <= 0 ? 1 : 1 - remaining / COOLDOWN_MS;
  }

  /** Read-only — for tests/debug/future decoy VFX. */
  get activeDecoy(): Readonly<{ x: number; y: number; expiresAt: number }> | null {
    return this.decoy;
  }
}
