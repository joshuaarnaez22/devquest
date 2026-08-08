/**
 * Fixed-size ring of frame times (ms) for the debug sparkline.
 * docs/15-Performance.md §13.2
 */
export class FrameTimeRing {
  private readonly buf: Float64Array;
  private write = 0;
  private filled = 0;

  constructor(capacity = 60) {
    this.buf = new Float64Array(capacity);
  }

  get capacity(): number {
    return this.buf.length;
  }

  get count(): number {
    return this.filled;
  }

  push(ms: number): void {
    this.buf[this.write] = ms;
    this.write = (this.write + 1) % this.buf.length;
    if (this.filled < this.buf.length) this.filled += 1;
  }

  /** Oldest → newest into `out` (length ≥ count). Returns count written. */
  copyChronological(out: number[]): number {
    const n = this.filled;
    const cap = this.buf.length;
    const start = this.filled < cap ? 0 : this.write;
    for (let i = 0; i < n; i++) {
      out[i] = this.buf[(start + i) % cap] ?? 0;
    }
    return n;
  }

  latest(): number {
    if (this.filled === 0) return 0;
    const idx = (this.write - 1 + this.buf.length) % this.buf.length;
    return this.buf[idx] ?? 0;
  }

  mean(): number {
    if (this.filled === 0) return 0;
    let sum = 0;
    const n = this.filled;
    const cap = this.buf.length;
    const start = this.filled < cap ? 0 : this.write;
    for (let i = 0; i < n; i++) {
      sum += this.buf[(start + i) % cap] ?? 0;
    }
    return sum / n;
  }
}
