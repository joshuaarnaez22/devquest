import { describe, expect, it } from 'vitest';
import { damageNumberText, stackOffsetY } from '@systems/damageNumberRules';

describe('damageNumberText (§6.8)', () => {
  it('rounds and stringifies a normal number', () => {
    expect(damageNumberText(22, 'normal')).toBe('22');
    expect(damageNumberText(21.6, 'critical')).toBe('22');
  });

  it('shows BLOCK instead of a number for the blocked style', () => {
    expect(damageNumberText(0, 'blocked')).toBe('BLOCK');
    expect(damageNumberText(999, 'blocked')).toBe('BLOCK'); // text overrides regardless of value
  });
});

describe('stackOffsetY — proximity stacking (§6.8)', () => {
  const P = { x: 100, y: 50 };

  it('no offset when nothing is nearby', () => {
    expect(stackOffsetY(P, [])).toBe(0);
    expect(stackOffsetY(P, [{ x: 200, y: 50 }])).toBe(0);
  });

  it('offsets 10px when a live number is within 8px', () => {
    expect(stackOffsetY(P, [{ x: 105, y: 50 }])).toBe(-10);
  });

  it('does not stack at exactly the 8px boundary (exclusive)', () => {
    expect(stackOffsetY(P, [{ x: 108, y: 50 }])).toBe(0);
  });

  it('stacks against every conflicting number, not just the nearest', () => {
    const live = [
      { x: 102, y: 50 },
      { x: 103, y: 50 },
      { x: 200, y: 50 }, // far — does not count
    ];
    expect(stackOffsetY(P, live)).toBe(-20);
  });

  it('measures proximity radially (x and y both matter)', () => {
    expect(stackOffsetY(P, [{ x: 100, y: 55 }])).toBe(-10); // 5px away vertically
  });

  it('respects custom proximity/offset thresholds', () => {
    expect(stackOffsetY(P, [{ x: 120, y: 50 }], 25, 5)).toBe(-5);
  });
});
