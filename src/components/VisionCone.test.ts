import { describe, expect, it } from 'vitest';
import { VisionCone, type SenseConfig } from '@components/VisionCone';

// Skeleton (§6.1.4): sightRange 96, sightAngleDeg 120, hearRange 48, requiresLineOfSight true.
const SKELETON_SENSE: SenseConfig = {
  sightRange: 96,
  sightAngleDeg: 120,
  hearRange: 48,
  loseSightMs: 2500,
  requiresLineOfSight: true,
};

describe('VisionCone (§5.5)', () => {
  it('cannot see beyond sightRange, even directly ahead', () => {
    const cone = new VisionCone(SKELETON_SENSE);
    expect(cone.canSee({ x: 0, y: 0 }, 1, { x: 97, y: 0 }, () => true)).toBe(false);
  });

  it('sees a target directly ahead, within range', () => {
    const cone = new VisionCone(SKELETON_SENSE);
    expect(cone.canSee({ x: 0, y: 0 }, 1, { x: 90, y: 0 }, () => true)).toBe(true);
  });

  it('cannot see a target behind facing, outside the cone, past hearing range', () => {
    const cone = new VisionCone(SKELETON_SENSE);
    // Facing right (+1), target directly behind at x=-60 -- outside the 48px hearRange.
    expect(cone.canSee({ x: 0, y: 0 }, 1, { x: -60, y: 0 }, () => true)).toBe(false);
  });

  it('hearing bypasses the cone (behind, but within hearRange)', () => {
    const cone = new VisionCone(SKELETON_SENSE);
    expect(cone.canSee({ x: 0, y: 0 }, 1, { x: -40, y: 0 }, () => true)).toBe(true);
  });

  it('hearing does not bypass sightRange itself', () => {
    const short: SenseConfig = { ...SKELETON_SENSE, sightRange: 30, hearRange: 48 };
    const cone = new VisionCone(short);
    // Within hearRange (48) but beyond the (shorter) sightRange (30) -- range still wins.
    expect(cone.canSee({ x: 0, y: 0 }, 1, { x: 40, y: 0 }, () => true)).toBe(false);
  });

  it('respects the cone half-angle at its edge', () => {
    const cone = new VisionCone(SKELETON_SENSE); // 120deg total = 60deg half-angle
    // 50px ahead, 80px up -- outside hearRange, angle ~58deg, inside the 60deg half-cone.
    expect(cone.canSee({ x: 0, y: 0 }, 1, { x: 50, y: 80 }, () => true)).toBe(true);
    // A much steeper angle falls outside the cone.
    expect(cone.canSee({ x: 0, y: 0 }, 1, { x: 10, y: 80 }, () => true)).toBe(false);
  });

  it('blocked line of sight fails the check when requiresLineOfSight is true', () => {
    const cone = new VisionCone(SKELETON_SENSE);
    expect(cone.canSee({ x: 0, y: 0 }, 1, { x: 90, y: 0 }, () => false)).toBe(false);
  });

  it('an absent line-of-sight check defaults to unobstructed (no tilemap in M2)', () => {
    const cone = new VisionCone(SKELETON_SENSE);
    expect(cone.canSee({ x: 0, y: 0 }, 1, { x: 90, y: 0 })).toBe(true);
  });

  it('line of sight is ignored when requiresLineOfSight is false', () => {
    const cone = new VisionCone({ ...SKELETON_SENSE, requiresLineOfSight: false });
    expect(cone.canSee({ x: 0, y: 0 }, 1, { x: 90, y: 0 }, () => false)).toBe(true);
  });

  it('exposes loseSightMs for the FSM grace period', () => {
    const cone = new VisionCone(SKELETON_SENSE);
    expect(cone.loseSightMs).toBe(2500);
  });
});
