import { describe, expect, it } from 'vitest';
import { CAMERA } from '@config/CameraConstants';
import {
  createCameraFollowState,
  stepAxis,
  tickCameraFollow,
  tickLookAhead,
  traumaOffset,
} from '@systems/cameraFollow';

describe('cameraFollow', () => {
  it('look-ahead eases to +24 px above 70% max run speed', () => {
    let look = 0;
    const maxRun = 100;
    for (let i = 0; i < 40; i++) {
      look = tickLookAhead(look, { playerVx: 80, facing: 1, maxRunSpeed: maxRun, deltaMs: 50 });
    }
    expect(look).toBeCloseTo(CAMERA.LOOK_AHEAD_PX, 0);
  });

  it('look-ahead eases back to 0 when slow', () => {
    let look: number = CAMERA.LOOK_AHEAD_PX;
    for (let i = 0; i < 40; i++) {
      look = tickLookAhead(look, { playerVx: 10, facing: 1, maxRunSpeed: 100, deltaMs: 50 });
    }
    expect(Math.abs(look)).toBeLessThan(1);
  });

  it('stepAxis keeps focus inside deadzone without jumping', () => {
    const view = 148;
    const dead = CAMERA.DEADZONE_H;
    let scroll = 0;
    scroll = stepAxis({
      scroll,
      focus: view / 2,
      viewSize: view,
      deadzone: dead,
      boundsMax: 1000,
    });
    expect(scroll).toBeCloseTo(0, 0);
    for (let i = 0; i < 5; i++) {
      scroll = stepAxis({
        scroll,
        focus: 400,
        viewSize: view,
        deadzone: dead,
        boundsMax: 1000,
      });
    }
    expect(scroll).toBeGreaterThan(0);
    expect(scroll).toBeLessThan(400);
  });

  it('scroll stays finite while chasing a moving target', () => {
    const state = createCameraFollowState(0, 0);
    for (let i = 0; i < 120; i++) {
      tickCameraFollow(state, {
        playerX: 50 + i,
        playerY: 100,
        playerVx: 90,
        grounded: true,
        facing: 1,
        maxRunSpeed: 90,
        viewW: 320,
        viewH: 148,
        boundsW: 2000,
        boundsH: 400,
        deltaMs: 1000 / 60,
      });
    }
    expect(Number.isFinite(state.scrollX)).toBe(true);
    expect(Number.isFinite(state.scrollY)).toBe(true);
    expect(state.scrollX).toBeGreaterThan(0);
  });

  it('vertical snap engages after a ≥48 px fall and eases without a whip jump', () => {
    const state = createCameraFollowState(0, 50);
    tickCameraFollow(state, {
      playerX: 160,
      playerY: 100,
      playerVx: 0,
      grounded: false,
      facing: 1,
      maxRunSpeed: 90,
      viewW: 320,
      viewH: 148,
      boundsW: 2000,
      boundsH: 800,
      deltaMs: 16,
    });
    tickCameraFollow(state, {
      playerX: 160,
      playerY: 80,
      playerVx: 0,
      grounded: false,
      facing: 1,
      maxRunSpeed: 90,
      viewW: 320,
      viewH: 148,
      boundsW: 2000,
      boundsH: 800,
      deltaMs: 16,
    });
    const beforeLand = state.scrollY;
    tickCameraFollow(state, {
      playerX: 160,
      playerY: 200,
      playerVx: 0,
      grounded: true,
      facing: 1,
      maxRunSpeed: 90,
      viewW: 320,
      viewH: 148,
      boundsW: 2000,
      boundsH: 800,
      deltaMs: 16,
    });
    expect(state.snapBlend).toBe(0);
    expect(Math.abs(state.scrollY - beforeLand)).toBeLessThan(30);

    const mid = state.scrollY;
    for (let i = 0; i < 20; i++) {
      tickCameraFollow(state, {
        playerX: 160,
        playerY: 200,
        playerVx: 0,
        grounded: true,
        facing: 1,
        maxRunSpeed: 90,
        viewW: 320,
        viewH: 148,
        boundsW: 2000,
        boundsH: 800,
        deltaMs: 16,
      });
    }
    expect(state.snapBlend).toBe(1);
    expect(Math.abs(state.scrollY - mid)).toBeLessThan(80);
  });

  it('trauma offset is quadratic and pixel-rounded', () => {
    const small = traumaOffset(0.14, 1, 0);
    const big = traumaOffset(0.6, 1, 0);
    expect(Number.isInteger(small.ox)).toBe(true);
    expect(Number.isInteger(big.ox)).toBe(true);
    expect(Math.abs(big.ox)).toBeGreaterThan(Math.abs(small.ox));
    expect(Math.abs(big.ox)).toBeLessThanOrEqual(CAMERA.TRAUMA_MAX_OFFSET_PX);
  });
});
