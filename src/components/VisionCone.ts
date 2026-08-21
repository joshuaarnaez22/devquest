import type { Vec2 } from '@core/GameEvents';

/** NORMATIVE — docs/08-Enemy-System.md §5.5. */
export interface SenseConfig {
  readonly sightRange: number; // px
  readonly sightAngleDeg: number; // total cone, centred on facing
  readonly hearRange: number; // omnidirectional, ignores facing and walls
  readonly loseSightMs: number; // grace before losing the player
  readonly requiresLineOfSight: boolean;
}

/**
 * `true` if nothing solid stands between `from` and `to`. M2 has no tilemap (M3
 * territory) — `canSee` treats an absent line-of-sight check as "unobstructed" so
 * the Skeleton's `requiresLineOfSight: true` (§6.1.4) does not silently break in the
 * M1 grey-box level, which has no queryable tile geometry yet.
 */
export type LineOfSightCheck = (from: Readonly<Vec2>, to: Readonly<Vec2>) => boolean;

export class VisionCone {
  constructor(private readonly cfg: SenseConfig) {}

  canSee(
    self: Readonly<Vec2>,
    facing: -1 | 1,
    target: Readonly<Vec2>,
    lineOfSightClear: LineOfSightCheck = () => true,
  ): boolean {
    const dx = target.x - self.x;
    const dy = target.y - self.y;
    const dist = Math.hypot(dx, dy);

    if (dist > this.cfg.sightRange) return false;

    // Hearing bypasses the cone but not the range.
    if (dist <= this.cfg.hearRange) return true;

    // Cone check — is the target within sightAngleDeg of facing?
    const angleToTarget = Math.atan2(dy, dx * facing);
    if (Math.abs(angleToTarget) > (this.cfg.sightAngleDeg * Math.PI) / 180 / 2) return false;

    if (this.cfg.requiresLineOfSight && !lineOfSightClear(self, target)) return false;

    return true;
  }

  get loseSightMs(): number {
    return this.cfg.loseSightMs;
  }
}
