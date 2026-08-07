export interface Poolable {
  reset(): void;
  onDespawn(): void;
  active: boolean;
}

export interface PoolStats {
  readonly free: number;
  readonly live: number;
  readonly peak: number;
}

export class ObjectPool<T extends Poolable> {
  private readonly free: T[] = [];
  private readonly live = new Set<T>();
  private peakLive = 0;

  constructor(
    private readonly factory: () => T,
    initialSize: number,
    private readonly maxSize: number,
  ) {
    for (let i = 0; i < initialSize; i++) {
      this.free.push(this.make());
    }
  }

  acquire(): T | undefined {
    let obj = this.free.pop();
    if (obj === undefined) {
      if (this.live.size >= this.maxSize) {
        obj = this.recycleOldest();
        if (obj === undefined) return undefined;
      } else {
        obj = this.make();
      }
    }
    obj.reset();
    obj.active = true;
    this.live.add(obj);
    if (this.live.size > this.peakLive) this.peakLive = this.live.size;
    return obj;
  }

  release(obj: T): void {
    if (!this.live.delete(obj)) return;
    obj.onDespawn();
    obj.active = false;
    this.free.push(obj);
  }

  releaseAll(): void {
    for (const o of [...this.live]) {
      this.release(o);
    }
  }

  get stats(): PoolStats {
    return { free: this.free.length, live: this.live.size, peak: this.peakLive };
  }

  private make(): T {
    const obj = this.factory();
    obj.active = false;
    return obj;
  }

  private recycleOldest(): T | undefined {
    const oldest = this.live.values().next().value;
    if (oldest === undefined) return undefined;
    this.live.delete(oldest);
    oldest.onDespawn();
    oldest.active = false;
    return oldest;
  }
}
