/**
 * Invulnerability window (docs/07-Combat.md §9.1, §12).
 *
 * I-frames do NOT stack: the longest active window wins. `grant()` uses `Math.max`
 * on the expiry, so a shorter grant during a longer window is a no-op and there is
 * never a gap between overlapping sources.
 */
export class IFrames {
  private expiresAt = 0;

  grant(durationMs: number, now: number): void {
    this.expiresAt = Math.max(this.expiresAt, now + durationMs); // longest wins
  }

  isActive(now: number): boolean {
    return now < this.expiresAt;
  }

  clear(): void {
    this.expiresAt = 0;
  }
}
