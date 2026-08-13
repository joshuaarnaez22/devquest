import { describe, expect, it } from 'vitest';
import { IFrames } from '@components/IFrames';

describe('IFrames longest-wins, never additive (§9.1)', () => {
  it('is inactive before any grant', () => {
    const i = new IFrames();
    expect(i.isActive(0)).toBe(false);
  });

  it('a single grant is active until its expiry, then not', () => {
    const i = new IFrames();
    i.grant(800, 1000); // expires at 1800
    expect(i.isActive(1799)).toBe(true);
    expect(i.isActive(1800)).toBe(false); // now < expiresAt, so 1800 is over
  });

  it('a shorter grant during a longer window does NOT shorten it', () => {
    const i = new IFrames();
    i.grant(800, 1000); // damage i-frames, expire 1800
    i.grant(170, 1200); // a dash grant that would expire 1370
    expect(i.isActive(1370)).toBe(true); // still covered by the 1800 window
    expect(i.isActive(1799)).toBe(true);
    expect(i.isActive(1800)).toBe(false);
  });

  it('grants do not sum — overlapping windows extend to the max expiry, not their total', () => {
    const i = new IFrames();
    i.grant(200, 1000); // expire 1200
    i.grant(200, 1100); // expire 1300 (max), NOT 1400
    expect(i.isActive(1299)).toBe(true);
    expect(i.isActive(1300)).toBe(false);
  });

  it('a later, longer grant extends the window', () => {
    const i = new IFrames();
    i.grant(170, 1000); // expire 1170
    i.grant(800, 1100); // expire 1900
    expect(i.isActive(1900 - 1)).toBe(true);
    expect(i.isActive(1900)).toBe(false);
  });

  it('clear ends the window immediately', () => {
    const i = new IFrames();
    i.grant(800, 1000);
    i.clear();
    expect(i.isActive(1001)).toBe(false);
  });
});
