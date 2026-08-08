import { describe, expect, it } from 'vitest';
import { VFX } from '@config/VfxConstants';
import { ObjectPool } from '@core/ObjectPool';
import {
  afterimageOffsetsMs,
  landDustKind,
  shouldEmitRunDust,
  shouldEmitSkid,
} from '@systems/vfxRules';
import type { Poolable } from '@core/ObjectPool';

describe('vfxRules', () => {
  it('maps land impact speed to dust kinds', () => {
    expect(landDustKind(0)).toBe('dust_land_soft');
    expect(landDustKind(200)).toBe('dust_land_medium');
    expect(landDustKind(300)).toBe('dust_land_hard');
  });

  it('spaces three dash afterimages at 60 ms', () => {
    expect(afterimageOffsetsMs()).toEqual([0, 60, 120]);
  });

  it('gates run dust on grounded speed and interval', () => {
    expect(shouldEmitRunDust(true, 50, VFX.RUN_DUST_INTERVAL_MS)).toBe(true);
    expect(shouldEmitRunDust(true, 50, VFX.RUN_DUST_INTERVAL_MS - 1)).toBe(false);
    expect(shouldEmitRunDust(false, 50, VFX.RUN_DUST_INTERVAL_MS)).toBe(false);
    expect(shouldEmitRunDust(true, 10, VFX.RUN_DUST_INTERVAL_MS)).toBe(false);
  });

  it('detects skid when input opposes velocity', () => {
    expect(shouldEmitSkid(true, -1, 80)).toBe(true);
    expect(shouldEmitSkid(true, 1, 80)).toBe(false);
    expect(shouldEmitSkid(true, -1, 10)).toBe(false);
  });
});

describe('VFX pool steady-state (60 s movement sim)', () => {
  it('reuses pooled slots — factory count never exceeds max', () => {
    let created = 0;
    class Token implements Poolable {
      active = false;
      life = 0;
      reset(): void {
        this.life = VFX.DUST_LIFE_MS;
      }
      onDespawn(): void {
        this.life = 0;
      }
    }

    const pool = new ObjectPool(
      () => {
        created += 1;
        return new Token();
      },
      VFX.DUST_POOL_INITIAL,
      VFX.DUST_POOL_MAX,
    );

    const live: Token[] = [];
    const frameMs = 1000 / 60;
    const frames = 60 * 60; // 60 s @ 60 fps

    for (let f = 0; f < frames; f++) {
      // Continuous run dust every interval + jump/land bursts.
      if (f % Math.ceil(VFX.RUN_DUST_INTERVAL_MS / frameMs) === 0) {
        const t = pool.acquire();
        if (t !== undefined) live.push(t);
      }
      if (f % 90 === 0) {
        const t = pool.acquire();
        if (t !== undefined) live.push(t);
      }
      for (let i = live.length - 1; i >= 0; i--) {
        const t = live[i];
        if (t === undefined) continue;
        t.life -= frameMs;
        if (t.life <= 0) {
          pool.release(t);
          live.splice(i, 1);
        }
      }
    }

    expect(created).toBeLessThanOrEqual(VFX.DUST_POOL_MAX);
    expect(pool.stats.live + pool.stats.free).toBe(created);
    pool.releaseAll();
    expect(pool.stats.live).toBe(0);
  });
});
