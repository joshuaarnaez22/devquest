import { describe, expect, it } from 'vitest';
import { SQUASH } from '@config/SquashConstants';
import { landImpactFromSpeed, landPreset, withinDeformBudget } from '@entities/ProceduralAnim';

describe('landImpactFromSpeed', () => {
  it('tiers soft / medium / hard by downward speed', () => {
    expect(landImpactFromSpeed(0)).toBe('soft');
    expect(landImpactFromSpeed(149)).toBe('soft');
    expect(landImpactFromSpeed(150)).toBe('medium');
    expect(landImpactFromSpeed(250)).toBe('medium');
    expect(landImpactFromSpeed(251)).toBe('hard');
  });
});

describe('squash presets', () => {
  it('keeps every movement preset within ±25% deform budget', () => {
    const pairs: Array<readonly [number, number]> = [
      [SQUASH.JUMP.scaleX, SQUASH.JUMP.scaleY],
      [SQUASH.FALL.scaleX, SQUASH.FALL.scaleY],
      [SQUASH.LAND_SOFT.scaleX, SQUASH.LAND_SOFT.scaleY],
      [SQUASH.LAND_MEDIUM.scaleX, SQUASH.LAND_MEDIUM.scaleY],
      [SQUASH.LAND_HARD.scaleX, SQUASH.LAND_HARD.scaleY],
    ];
    for (const [sx, sy] of pairs) {
      expect(withinDeformBudget(sx, sy)).toBe(true);
    }
  });

  it('gives jump, fall, and three land tiers distinct scales', () => {
    const soft = landPreset('soft');
    const medium = landPreset('medium');
    const hard = landPreset('hard');
    const keys = new Set([
      `${SQUASH.JUMP.scaleX},${SQUASH.JUMP.scaleY}`,
      `${SQUASH.FALL.scaleX},${SQUASH.FALL.scaleY}`,
      `${soft.scaleX},${soft.scaleY}`,
      `${medium.scaleX},${medium.scaleY}`,
      `${hard.scaleX},${hard.scaleY}`,
    ]);
    expect(keys.size).toBe(5);
    expect(soft.durationMs).not.toBe(medium.durationMs);
    expect(medium.durationMs).not.toBe(hard.durationMs);
  });
});
