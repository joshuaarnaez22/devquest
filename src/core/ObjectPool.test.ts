import { beforeEach, describe, expect, it } from 'vitest';
import { ObjectPool } from '@core/ObjectPool';
import type { Poolable } from '@core/ObjectPool';

interface TestObj extends Poolable {
  readonly id: number;
  resetCount: number;
  despawnCount: number;
}

let nextId = 0;

function makePoolable(): TestObj {
  const id = nextId++;
  return {
    id,
    active: false,
    resetCount: 0,
    despawnCount: 0,
    reset() {
      this.resetCount += 1;
    },
    onDespawn() {
      this.despawnCount += 1;
    },
  };
}

describe('ObjectPool', () => {
  beforeEach(() => {
    nextId = 0;
  });

  it('pre-warms to initial size', () => {
    const pool = new ObjectPool(makePoolable, 3, 5);
    expect(pool.stats.free).toBe(3);
    expect(pool.stats.live).toBe(0);
  });

  it('acquires and releases objects', () => {
    const pool = new ObjectPool(makePoolable, 1, 4);
    const a = pool.acquire();
    expect(a).toBeDefined();
    expect(pool.stats.live).toBe(1);
    pool.release(a!);
    expect(pool.stats.live).toBe(0);
    expect(pool.stats.free).toBe(1);
  });

  it('tracks peak live count', () => {
    const pool = new ObjectPool(makePoolable, 0, 3);
    const a = pool.acquire()!;
    const b = pool.acquire()!;
    expect(pool.stats.peak).toBe(2);
    pool.release(a);
    pool.release(b);
    expect(pool.stats.peak).toBe(2);
  });

  it('double release is a no-op', () => {
    const pool = new ObjectPool(makePoolable, 1, 2);
    const a = pool.acquire()!;
    pool.release(a);
    pool.release(a);
    expect(pool.stats.live).toBe(0);
    expect(pool.stats.free).toBe(1);
  });

  it('recycles the oldest live object when at cap', () => {
    const pool = new ObjectPool(makePoolable, 0, 2);
    const first = pool.acquire()!;
    const second = pool.acquire()!;
    const third = pool.acquire()!;
    expect(third).toBe(first);
    expect(pool.stats.live).toBe(2);
    expect(first.despawnCount).toBe(1);
    expect(second.active).toBe(true);
  });

  it('returns undefined when cap is zero and pool is empty', () => {
    const pool = new ObjectPool(makePoolable, 0, 0);
    expect(pool.acquire()).toBeUndefined();
  });

  it('releaseAll clears live set', () => {
    const pool = new ObjectPool(makePoolable, 0, 4);
    pool.acquire();
    pool.acquire();
    pool.releaseAll();
    expect(pool.stats.live).toBe(0);
  });
});
