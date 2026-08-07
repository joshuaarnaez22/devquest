import { describe, expect, it } from 'vitest';
import { Timer } from '@core/Timer';

describe('Timer', () => {
  it('is inactive until started', () => {
    const t = new Timer();
    expect(t.isActive(100)).toBe(false);
    expect(t.remaining(100)).toBe(0);
  });

  it('tracks an absolute window', () => {
    const t = new Timer();
    t.start(1000, 200);
    expect(t.isActive(1100)).toBe(true);
    expect(t.remaining(1100)).toBe(100);
    expect(t.isActive(1200)).toBe(false);
    expect(t.remaining(1300)).toBe(0);
  });

  it('clear resets the window', () => {
    const t = new Timer();
    t.start(0, 500);
    t.clear();
    expect(t.isActive(100)).toBe(false);
  });
});
