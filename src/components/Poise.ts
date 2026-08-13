/**
 * Poise — a depleting pool that regenerates, not a threshold (docs/07-Combat.md §8.1).
 *
 * On break (pool ≤ 0) the pool RESETS TO MAXIMUM and the hit reports a break, so the
 * next hit starts the enemy fresh. Regeneration is all-or-nothing: after `regenDelayMs`
 * with no hits, the full pool is restored in one step (never a gradual refill).
 *
 * §12 shows this holding a `Clock`, but `components` may not import `platform`
 * (eslint layer boundary), so `now` is passed in — matching `IFrames` in the same
 * section. The caller (a system/entity, which may import platform) supplies `Clock.now()`.
 */
export class Poise {
  private current: number;
  private lastHitAt = -Infinity;

  constructor(
    public readonly max: number,
    private readonly regenDelayMs: number,
  ) {
    this.current = max;
  }

  /** Returns true if this hit BROKE poise (pool then resets to max). */
  damage(amount: number, now: number): boolean {
    this.lastHitAt = now;
    this.current -= amount;
    if (this.current <= 0) {
      this.current = this.max;
      return true;
    }
    return false;
  }

  /** Full poise restored after `regenDelayMs` with no hits taken. */
  update(now: number): void {
    if (this.current >= this.max) return;
    if (now - this.lastHitAt >= this.regenDelayMs) this.current = this.max;
  }

  get value(): number {
    return this.current;
  }

  get normalised(): number {
    return this.current / this.max;
  }
}
