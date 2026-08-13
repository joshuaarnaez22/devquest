import { describe, expect, it } from 'vitest';
import { Health } from '@components/Health';

describe('Health (§12)', () => {
  it('starts full', () => {
    const h = new Health(100);
    expect(h.value).toBe(100);
    expect(h.normalised).toBe(1);
    expect(h.isDead).toBe(false);
  });

  it('clamps damage at zero and reports death', () => {
    const h = new Health(100);
    h.damage(140);
    expect(h.value).toBe(0);
    expect(h.isDead).toBe(true);
  });

  it('heal clamps at max', () => {
    const h = new Health(100);
    h.damage(30);
    h.heal(50);
    expect(h.value).toBe(100);
  });

  it('reset restores to max', () => {
    const h = new Health(100);
    h.damage(100);
    h.reset();
    expect(h.value).toBe(100);
    expect(h.isDead).toBe(false);
  });
});
