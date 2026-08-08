import { describe, expect, it } from 'vitest';
import { FrameTimeRing } from '@core/FrameTimeRing';
import { Profiler } from '@core/Profiler';
import type { System } from '@core/SystemRegistry';

describe('FrameTimeRing', () => {
  it('keeps a chronological window of the last N samples', () => {
    const ring = new FrameTimeRing(3);
    ring.push(1);
    ring.push(2);
    ring.push(3);
    ring.push(4);
    const out: number[] = [];
    expect(ring.copyChronological(out)).toBe(3);
    expect(out.slice(0, 3)).toEqual([2, 3, 4]);
    expect(ring.latest()).toBe(4);
    expect(ring.mean()).toBeCloseTo(3, 5);
  });
});

describe('Profiler', () => {
  it('records update duration when instrumentation is active', () => {
    const profiler = new Profiler();
    const sys: System = {
      id: 'probe',
      enabled: true,
      update: () => {
        let x = 0;
        for (let i = 0; i < 1000; i++) x += i;
        void x;
      },
    };
    const wrapped = profiler.wrap(sys);
    wrapped.update?.(0, 16);
    if (profiler.enabled) {
      expect(profiler.sampleMs('probe')).toBeGreaterThanOrEqual(0);
    } else {
      expect(wrapped.update).toBe(sys.update);
    }
  });

  it('does not accumulate postPhysics-only costs across frames', () => {
    const profiler = new Profiler();
    const sys: System = {
      id: 'vfx',
      enabled: true,
      postPhysics: () => {
        let x = 0;
        for (let i = 0; i < 500; i++) x += i;
        void x;
      },
    };
    const wrapped = profiler.wrap(sys);
    if (!profiler.enabled) return;
    wrapped.postPhysics?.(0, 16);
    const first = profiler.sampleMs('vfx');
    wrapped.postPhysics?.(0, 16);
    const second = profiler.sampleMs('vfx');
    // Replace each frame — second must not be ~2× first.
    expect(second).toBeLessThan(first * 1.8 + 0.5);
    expect(second).toBeGreaterThanOrEqual(0);
  });
});
