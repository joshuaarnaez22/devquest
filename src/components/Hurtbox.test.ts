import { describe, expect, it } from 'vitest';
import { Hurtbox } from '@components/Hurtbox';
import type { BoxSpec } from '@components/Box';

// Player body from docs/07-Combat.md §5.3: 14 × 28.
const SPEC: BoxSpec = { width: 14, height: 28, offsetX: 0, offsetY: 0 };

describe('Hurtbox', () => {
  it('computes its world rect (top-left, centered on the offset)', () => {
    const hb = new Hurtbox(SPEC);
    expect(hb.rect(100, 50, 1)).toEqual({ x: 93, y: 36, width: 14, height: 28 });
  });

  it('can be disabled and re-enabled (off-screen culling, §9.5)', () => {
    const hb = new Hurtbox(SPEC);
    expect(hb.enabled).toBe(true);
    hb.setEnabled(false);
    expect(hb.enabled).toBe(false);
    hb.setEnabled(true);
    expect(hb.enabled).toBe(true);
  });

  it('setSpec swaps geometry, e.g. crouch (14 × 17)', () => {
    const hb = new Hurtbox(SPEC);
    hb.setSpec({ width: 14, height: 17, offsetX: 0, offsetY: 5.5 });
    expect(hb.rect(0, 0, 1).height).toBe(17);
  });
});
