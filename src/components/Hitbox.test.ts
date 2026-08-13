import { describe, expect, it } from 'vitest';
import { Hitbox } from '@components/Hitbox';
import type { BoxSpec } from '@components/Box';

const SPEC: BoxSpec = { width: 20, height: 16, offsetX: 12, offsetY: 0 };
const FRAME = 1000 / 60; // 16.67 ms
const VICTIM = 42;

describe('Hitbox active window (§5.1, §5.5)', () => {
  it('is inactive during windup and active only within the window', () => {
    const hb = new Hitbox();
    hb.schedule(0, 100, 83, SPEC); // active 100..183
    expect(hb.update(99)).toBe(false);
    expect(hb.update(100)).toBe(true);
    expect(hb.update(182)).toBe(true);
    expect(hb.update(183)).toBe(false); // deactivateAt is exclusive
  });

  it('cancel deactivates immediately with no lingering window', () => {
    const hb = new Hitbox();
    hb.schedule(0, 0, 83, SPEC);
    expect(hb.update(10)).toBe(true);
    hb.cancel();
    expect(hb.update(20)).toBe(false);
  });
});

describe('Hitbox dedup — one swing hits a victim exactly once (§5.1)', () => {
  it('an 83 ms window over 5 physics frames deals exactly one hit', () => {
    const hb = new Hitbox();
    hb.schedule(0, 0, 83, SPEC); // active 0..83 ≈ 5 frames
    let hits = 0;
    for (let f = 0; f < 6; f++) {
      const now = f * FRAME; // 0, 16.7, 33.3, 50, 66.7, 83.3
      if (hb.update(now) && hb.canHit(VICTIM)) {
        hb.markHit(VICTIM);
        hits++;
      }
    }
    expect(hits).toBe(1);
  });

  it('a fresh activation resets dedup and bumps the instance id', () => {
    const hb = new Hitbox();
    hb.schedule(0, 0, 83, SPEC);
    hb.update(0);
    hb.markHit(VICTIM);
    expect(hb.canHit(VICTIM)).toBe(false);
    expect(hb.instance).toBe(1);

    hb.schedule(200, 0, 83, SPEC); // second swing
    expect(hb.canHit(VICTIM)).toBe(true);
    expect(hb.instance).toBe(2);
  });

  it('a single activation can still hit distinct victims', () => {
    const hb = new Hitbox();
    hb.schedule(0, 0, 83, SPEC);
    hb.update(0);
    hb.markHit(1);
    expect(hb.canHit(1)).toBe(false);
    expect(hb.canHit(2)).toBe(true);
  });
});

describe('Hitbox geometry', () => {
  it('projects the box forward and mirrors with facing', () => {
    const hb = new Hitbox();
    hb.schedule(0, 0, 83, SPEC);
    const right = hb.rect(100, 50, 1);
    const left = hb.rect(100, 50, -1);
    expect(right.x).toBeGreaterThan(left.x);
    expect(right.width).toBe(20);
  });

  it('is a zero box before any schedule', () => {
    const hb = new Hitbox();
    expect(hb.rect(100, 50, 1).width).toBe(0);
  });
});
