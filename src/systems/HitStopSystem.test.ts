import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as Clock from '@platform/Clock';
import { HitStopSystem } from '@systems/HitStopSystem';

describe('HitStopSystem (§6.2)', () => {
  beforeEach(() => {
    Clock.__resetOffset();
  });
  afterEach(() => {
    Clock.__resetOffset();
  });

  it('only participants freeze — everything else (e.g. particles) is unaffected', () => {
    const hs = new HitStopSystem();
    hs.request(60, [1, 2]);
    expect(hs.isFrozen(1)).toBe(true);
    expect(hs.isFrozen(2)).toBe(true);
    expect(hs.isFrozen(99)).toBe(false); // a bystander id — never requested, never frozen
  });

  it('two 110ms requests produce a 110ms freeze, never 220ms (longest wins, never additive)', () => {
    const hs = new HitStopSystem();
    hs.request(110, [1]);
    Clock.__setOffsetMs(50);
    hs.request(110, [1]); // a second overlapping hit on the same victim
    // Total elapsed from the FIRST request must be 110ms, not 110+110.
    Clock.__setOffsetMs(109);
    expect(hs.isFrozen(1)).toBe(true);
    Clock.__setOffsetMs(160); // 110ms after the second request's own start (50+110)
    expect(hs.isFrozen(1)).toBe(false);
  });

  it('a shorter later request does not shorten an already-longer freeze', () => {
    const hs = new HitStopSystem();
    hs.request(110, [1]); // ends at 110
    Clock.__setOffsetMs(20);
    hs.request(40, [1]); // would end at 60 alone — shorter than the existing 110
    Clock.__setOffsetMs(100);
    expect(hs.isFrozen(1)).toBe(true); // still frozen — the 110 deadline wins
  });

  it('scaledDelta returns 0 while frozen and the real delta once released', () => {
    const hs = new HitStopSystem();
    hs.request(60, [1]);
    expect(hs.scaledDelta(1, 16.67)).toBe(0);
    Clock.__setOffsetMs(60);
    expect(hs.scaledDelta(1, 16.67)).toBe(16.67);
  });

  it('releases all participants together when the shared window elapses', () => {
    const hs = new HitStopSystem();
    hs.request(60, [1, 2, 3]);
    Clock.__setOffsetMs(60);
    expect(hs.isFrozen(1)).toBe(false);
    expect(hs.isFrozen(2)).toBe(false);
    expect(hs.isFrozen(3)).toBe(false);
  });

  it('a fresh request after the window closed starts a new, independent freeze', () => {
    const hs = new HitStopSystem();
    hs.request(60, [1]);
    Clock.__setOffsetMs(60); // window closed
    expect(hs.isFrozen(1)).toBe(false);

    hs.request(60, [1]);
    Clock.__setOffsetMs(119); // 59ms into the new window
    expect(hs.isFrozen(1)).toBe(true);
  });
});
