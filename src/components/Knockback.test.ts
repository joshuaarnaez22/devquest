import { describe, expect, it } from 'vitest';
import { Knockback } from '@components/Knockback';

// Heavy hit from docs/07-Combat.md §6.4: 140 px/s, −60 lift, 260 ms decay.
describe('Knockback decaying impulse (§6.4)', () => {
  it('is inactive until started', () => {
    const k = new Knockback();
    expect(k.active).toBe(false);
    expect(k.step(16.67)).toBe(0);
  });

  it('adds a signed horizontal impulse that shrinks toward zero', () => {
    const k = new Knockback();
    k.start(140, 1, -60, 260);
    const first = k.step(16.67); // t ≈ 1.0
    const secondStart = k.step(16.67); // t < 1.0
    expect(first).toBeGreaterThan(0);
    expect(secondStart).toBeGreaterThan(0);
    expect(secondStart).toBeLessThan(first); // decaying
  });

  it('pushes left when dirX is −1', () => {
    const k = new Knockback();
    k.start(140, -1, 0, 260);
    expect(k.step(16.67)).toBeLessThan(0);
  });

  it('goes inactive and returns 0 once the decay window elapses', () => {
    const k = new Knockback();
    k.start(140, 1, 0, 260);
    k.step(260); // consumes the whole window
    expect(k.active).toBe(false);
    expect(k.step(16.67)).toBe(0);
  });

  it('scales the impulse by impulseScale', () => {
    const a = new Knockback();
    const b = new Knockback();
    a.start(140, 1, 0, 260);
    b.start(140, 1, 0, 260);
    expect(a.step(16.67, 2)).toBeCloseTo(b.step(16.67, 1) * 2, 5);
  });

  it('applies vertical lift exactly once', () => {
    const k = new Knockback();
    k.start(140, 1, -60, 260);
    expect(k.takeLift()).toBe(-60);
    expect(k.takeLift()).toBe(0); // one-shot
  });

  it('start replaces an active impulse — same-frame hits do not sum (§9.3)', () => {
    const k = new Knockback();
    k.start(140, 1, -60, 260);
    k.step(100); // partway through
    k.start(70, -1, 0, 200); // a new hit from the other side
    expect(k.active).toBe(true);
    expect(k.step(16.67)).toBeLessThan(0); // now pushing left at full fresh strength
    expect(k.takeLift()).toBe(0); // the replacement had no lift
  });
});
