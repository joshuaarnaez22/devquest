import { describe, expect, it } from 'vitest';
import { aabbOverlap, boxRect, expand, GENEROSITY, type BoxSpec } from '@components/Box';

describe('aabbOverlap', () => {
  const a = { x: 0, y: 0, width: 10, height: 10 };
  it('detects an overlapping box', () => {
    expect(aabbOverlap(a, { x: 5, y: 5, width: 10, height: 10 })).toBe(true);
  });
  it('touching edges do not count as overlap', () => {
    expect(aabbOverlap(a, { x: 10, y: 0, width: 10, height: 10 })).toBe(false);
  });
  it('separated boxes do not overlap', () => {
    expect(aabbOverlap(a, { x: 20, y: 0, width: 10, height: 10 })).toBe(false);
  });
});

describe('boxRect centers on the facing-scaled offset', () => {
  const spec: BoxSpec = { width: 20, height: 16, offsetX: 12, offsetY: 0 };
  it('faces right', () => {
    expect(boxRect(spec, 100, 50, 1).x).toBe(102); // 100 + 12 - 10
  });
  it('mirrors the forward offset when facing left', () => {
    expect(boxRect(spec, 100, 50, -1).x).toBe(78); // 100 - 12 - 10
  });
});

describe('generosity asymmetry (§5.2)', () => {
  const visual: BoxSpec = { width: 16, height: 28, offsetX: 0, offsetY: 0 };

  it('player hurtbox shrinks 2 px each side and 3 px off the top', () => {
    const h = expand(visual, GENEROSITY.PLAYER_HURTBOX);
    expect(h.width).toBe(12); // 16 − 2 − 2
    expect(h.height).toBe(25); // 28 − 3
    expect(h.offsetX).toBe(0); // symmetric horizontally
    expect(h.offsetY).toBe(1.5); // top lowered 3 → center down 1.5
  });

  it('enemy hurtbox grows 2 px each side and 1 px on top', () => {
    const h = expand(visual, GENEROSITY.ENEMY_HURTBOX);
    expect(h.width).toBe(20);
    expect(h.height).toBe(29);
    expect(h.offsetY).toBe(-0.5); // top up 1 → center up 0.5
  });

  it('player hitbox extends 3 px forward and 2 px vertically', () => {
    const h = expand(visual, GENEROSITY.PLAYER_HITBOX);
    expect(h.width).toBe(19); // +3 on the forward edge only
    expect(h.height).toBe(30); // +1 top, +1 bottom
    expect(h.offsetX).toBe(1.5); // forward-only shift
    expect(h.offsetY).toBe(0);
  });

  it('the player is net narrower and reaches net further than the visual', () => {
    const hurt = expand(visual, GENEROSITY.PLAYER_HURTBOX);
    const hit = expand(visual, GENEROSITY.PLAYER_HITBOX);
    expect(hurt.width).toBeLessThan(visual.width);
    expect(hit.width).toBeGreaterThan(visual.width);
  });
});
