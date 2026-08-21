import { describe, expect, it } from 'vitest';
import { FrozenInputLatch } from '@entities/player/FrozenInputLatch';

const NONE = { attack: false, dash: false, special: false };

describe('FrozenInputLatch — input buffered during hit stop, never dropped (P3, §6.2)', () => {
  it('with nothing captured, applyAndClear passes the actual frame through unchanged', () => {
    const latch = new FrozenInputLatch();
    expect(latch.applyAndClear({ attack: true, dash: false, special: false })).toEqual({
      attack: true,
      dash: false,
      special: false,
    });
  });

  it('an attack pressed while frozen is applied on the first unfrozen frame', () => {
    const latch = new FrozenInputLatch();
    latch.captureWhileFrozen({ attackPressed: true, dashPressed: false, specialPressed: false });
    // The real frame, once unfrozen, has no press of its own — the latch is what fires it.
    expect(latch.applyAndClear(NONE)).toEqual({ attack: true, dash: false, special: false });
  });

  it('captures all three actions independently', () => {
    const latch = new FrozenInputLatch();
    latch.captureWhileFrozen({ attackPressed: false, dashPressed: true, specialPressed: false });
    latch.captureWhileFrozen({ attackPressed: false, dashPressed: false, specialPressed: true });
    expect(latch.applyAndClear(NONE)).toEqual({ attack: false, dash: true, special: true });
  });

  it('multiple presses across several frozen frames still just latch once (OR, not a count)', () => {
    const latch = new FrozenInputLatch();
    latch.captureWhileFrozen({ attackPressed: true, dashPressed: false, specialPressed: false });
    latch.captureWhileFrozen({ attackPressed: true, dashPressed: false, specialPressed: false });
    latch.captureWhileFrozen({ attackPressed: true, dashPressed: false, specialPressed: false });
    expect(latch.applyAndClear(NONE).attack).toBe(true);
  });

  it('clears after being applied — a later frame with no press stays false', () => {
    const latch = new FrozenInputLatch();
    latch.captureWhileFrozen({ attackPressed: true, dashPressed: false, specialPressed: false });
    latch.applyAndClear(NONE);
    expect(latch.applyAndClear(NONE)).toEqual(NONE);
  });

  it('a genuine same-frame press still comes through even with nothing latched', () => {
    const latch = new FrozenInputLatch();
    expect(latch.applyAndClear({ attack: false, dash: true, special: false })).toEqual({
      attack: false,
      dash: true,
      special: false,
    });
  });
});
