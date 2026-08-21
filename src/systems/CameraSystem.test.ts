import { describe, expect, it } from 'vitest';
import { HIT_TIERS } from '@config/CombatFeedback';
import { CameraSystem } from '@systems/CameraSystem';
import type { CameraFollowTarget, CameraHandle } from '@systems/CameraSystem';

function fakeCamera(): CameraHandle & { scrolls: { x: number; y: number }[] } {
  const scrolls: { x: number; y: number }[] = [];
  return {
    scrollX: 0,
    scrollY: 0,
    width: 320,
    height: 148,
    scrolls,
    setScroll(x: number, y: number) {
      this.scrollX = x;
      this.scrollY = y;
      scrolls.push({ x, y });
      return this;
    },
    setBounds() {
      return this;
    },
    setViewport() {
      return this;
    },
    setRoundPixels() {
      return this;
    },
    stopFollow() {
      return this;
    },
  };
}

function target(partial: Partial<CameraFollowTarget> = {}): CameraFollowTarget {
  return {
    x: 160,
    y: 100,
    velocityX: 0,
    grounded: true,
    facing: 1,
    maxRunSpeed: 90,
    ...partial,
  };
}

describe('CameraSystem', () => {
  it('addTrauma clamps to MAX_TRAUMA', () => {
    const cam = new CameraSystem();
    cam.addTrauma(0.8);
    cam.addTrauma(0.8);
    expect(cam.traumaLevel).toBe(CameraSystem.MAX_TRAUMA);
  });

  it('four simultaneous heavy hits clamp rather than sum (M2-T7 Verify, §6.6)', () => {
    // 4 x HIT_TIERS.heavy.trauma (0.26) = 1.04 — over MAX_TRAUMA if summed unclamped.
    const cam = new CameraSystem();
    for (let i = 0; i < 4; i++) cam.addTrauma(HIT_TIERS.heavy.trauma);
    expect(cam.traumaLevel).toBe(CameraSystem.MAX_TRAUMA);
    expect(cam.traumaLevel).toBeLessThan(4 * HIT_TIERS.heavy.trauma);
  });

  it('syncFollow writes rounded scroll without Phaser startFollow', () => {
    const handle = fakeCamera();
    const cam = new CameraSystem();
    cam.bind(handle, 2000, 400);
    cam.setTarget(target({ x: 400, y: 120, velocityX: 90 }));
    cam.syncFollow(16);
    expect(handle.scrolls.length).toBeGreaterThan(0);
    const last = handle.scrolls[handle.scrolls.length - 1];
    expect(last).toBeDefined();
    expect(Number.isFinite(last!.x)).toBe(true);
    expect(Number.isFinite(last!.y)).toBe(true);
  });

  it('reduced motion suppresses trauma offset', () => {
    const handle = fakeCamera();
    const cam = new CameraSystem();
    cam.bind(handle, 2000, 400);
    cam.setTarget(target());
    cam.snapToTarget();
    const base = { x: handle.scrollX, y: handle.scrollY };
    cam.addTrauma(1);
    cam.setReducedMotion(true);
    cam.syncFollow(16);
    expect(handle.scrollX).toBeCloseTo(base.x, 5);
    expect(handle.scrollY).toBeCloseTo(base.y, 5);
  });
});
