import { SQUASH, landImpactFromSpeed } from '@config/SquashConstants';
import { VFX } from '@config/VfxConstants';

export type DustKind =
  'dust_run' | 'dust_jump' | 'dust_skid' | 'dust_land_soft' | 'dust_land_medium' | 'dust_land_hard';

export function landDustKind(downSpeedPxPerSec: number): DustKind {
  const impact = landImpactFromSpeed(downSpeedPxPerSec);
  if (impact === 'soft') return 'dust_land_soft';
  if (impact === 'hard') return 'dust_land_hard';
  return 'dust_land_medium';
}

/** Soft <150, hard >250 — mirrors squash land tiers (docs/14 §8.1). */
export function landDustScale(kind: DustKind): number {
  switch (kind) {
    case 'dust_land_soft':
      return 1;
    case 'dust_land_medium':
      return 1.25;
    case 'dust_land_hard':
      return 1.5;
    default:
      return 1;
  }
}

export function shouldEmitRunDust(grounded: boolean, absVx: number, elapsedMs: number): boolean {
  return grounded && absVx > VFX.RUN_DUST_MIN_SPEED && elapsedMs >= VFX.RUN_DUST_INTERVAL_MS;
}

export function shouldEmitSkid(grounded: boolean, moveX: -1 | 0 | 1, vx: number): boolean {
  if (!grounded || moveX === 0) return false;
  if (Math.abs(vx) <= VFX.SKID_MIN_SPEED) return false;
  return Math.sign(vx) !== 0 && Math.sign(vx) !== moveX;
}

/** Afterimage spawn times relative to dash start. */
export function afterimageOffsetsMs(): readonly number[] {
  const out: number[] = [];
  for (let i = 0; i < VFX.AFTERIMAGE_COUNT; i++) {
    out.push(i * VFX.AFTERIMAGE_SPACING_MS);
  }
  return out;
}

/** Re-export land thresholds for VFX tests without importing squash table twice. */
export const LAND_SOFT_MAX = SQUASH.LAND_SOFT.maxImpactSpeed;
export const LAND_HARD_MIN = SQUASH.LAND_HARD.minImpactSpeed;
