import { describe, expect, it } from 'vitest';
import { Rng } from '@core/Rng';

describe('Rng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = new Rng(12345);
    const b = new Rng(12345);
    const seqA: number[] = [];
    const seqB: number[] = [];
    for (let i = 0; i < 20; i++) {
      seqA.push(a.next());
      seqB.push(b.next());
    }
    expect(seqA).toEqual(seqB);
  });

  it('nextFloat matches next for the same stream position', () => {
    const a = new Rng(1);
    const b = new Rng(1);
    expect(a.nextFloat()).toBe(b.next());
  });

  it('nextInt stays within range', () => {
    const rng = new Rng(99);
    for (let i = 0; i < 100; i++) {
      const n = rng.nextInt(10);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(10);
    }
  });

  it('throws in dev when nextInt max is not positive', () => {
    const rng = new Rng(1);
    expect(() => rng.nextInt(0)).toThrow(/max must be positive/);
  });
});
