import { describe, expect, it } from 'vitest';
import { Poise } from '@components/Poise';

// Skeleton values from docs/07-Combat.md §8.2: poise 12, regen delay 1500 ms.
const MAX = 12;
const REGEN = 1500;

describe('Poise break semantics (§8.1)', () => {
  it('a hit that drops the pool to <= 0 breaks and resets to max', () => {
    const p = new Poise(MAX, REGEN);
    const broke = p.damage(22, 1000); // one Samurai hit > 12 poise
    expect(broke).toBe(true);
    expect(p.value).toBe(MAX); // reset to max, NOT to zero
  });

  it('a hit that leaves the pool above zero only flinches', () => {
    const p = new Poise(60, REGEN); // Orc-like pool
    const broke = p.damage(22, 1000);
    expect(broke).toBe(false);
    expect(p.value).toBe(38);
  });

  it('exactly zero counts as a break (<= 0)', () => {
    const p = new Poise(22, REGEN);
    expect(p.damage(22, 1000)).toBe(true);
    expect(p.value).toBe(22);
  });
});

describe('Poise regen is all-or-nothing after regenDelayMs (§8.1)', () => {
  it('does not regen before the delay elapses', () => {
    const p = new Poise(60, REGEN);
    p.damage(22, 1000);
    p.update(1000 + REGEN - 1); // one ms early
    expect(p.value).toBe(38);
  });

  it('restores the FULL pool in one step at the delay, not gradually', () => {
    const p = new Poise(60, REGEN);
    p.damage(22, 1000);
    p.update(1000 + REGEN);
    expect(p.value).toBe(60);
  });

  it('a fresh hit pushes the regen deadline back', () => {
    const p = new Poise(60, REGEN);
    p.damage(22, 1000);
    p.damage(10, 1400); // resets lastHitAt to 1400
    p.update(1400 + REGEN - 1);
    expect(p.value).toBe(28); // 60 - 22 - 10, still not regenerated
    p.update(1400 + REGEN);
    expect(p.value).toBe(60);
  });

  it('update is a no-op when already at max', () => {
    const p = new Poise(MAX, REGEN);
    p.update(999_999);
    expect(p.value).toBe(MAX);
  });
});

describe('Poise.reset (docs/07 §9.1 respawn)', () => {
  it('restores the full pool and clears the hit timer', () => {
    const p = new Poise(MAX, REGEN);
    p.damage(5, 1000);
    p.reset();
    expect(p.value).toBe(MAX);
    p.update(1000 + REGEN); // would have regenerated anyway; confirms no dangling state
    expect(p.value).toBe(MAX);
  });
});
