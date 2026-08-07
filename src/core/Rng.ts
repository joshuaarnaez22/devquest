import { assert } from '@core/Assert';

/** Seeded PRNG (mulberry32). The only permitted use of non-deterministic randomness in the project. */
export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Returns a float in [0, 1). */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextFloat(): number {
    return this.next();
  }

  /** Uniform integer in [0, max). */
  nextInt(max: number): number {
    assert(max > 0, 'Rng.nextInt: max must be positive');
    return Math.floor(this.next() * max);
  }
}
