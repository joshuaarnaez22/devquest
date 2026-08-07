/** Absolute-timestamp interval (coyote time, jump buffer, i-frames). */
export class Timer {
  private endAtMs: number | null = null;

  start(nowMs: number, durationMs: number): void {
    this.endAtMs = nowMs + durationMs;
  }

  isActive(nowMs: number): boolean {
    return this.endAtMs !== null && nowMs < this.endAtMs;
  }

  remaining(nowMs: number): number {
    if (this.endAtMs === null) return 0;
    return Math.max(0, this.endAtMs - nowMs);
  }

  clear(): void {
    this.endAtMs = null;
  }
}
