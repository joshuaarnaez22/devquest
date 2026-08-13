/**
 * Per-victim knockback impulse — a horizontal push that decays linearly to zero plus
 * a one-shot vertical lift (docs/07-Combat.md §6.4).
 *
 * KnockbackSystem (M2-T7) ADDS `step()` to the body's velocity each frame rather than
 * overriding it, so a moving victim keeps their own input velocity underneath — a
 * knockback never reads as a total loss of control. Same-frame hits do not sum: `start`
 * replaces the active impulse (last-wins, §9.3).
 *
 * `impulseScale` (KnockbackSystem's config multiplier) is passed into `step` rather than
 * imported, keeping this component dependency-free.
 */
export class Knockback {
  private speed = 0; // px/s, unsigned base magnitude
  private dirX: -1 | 0 | 1 = 0;
  private liftY = 0; // px/s, applied once on the first step
  private decayMs = 0;
  private elapsedMs = 0;
  private lifted = false;

  start(speed: number, dirX: -1 | 0 | 1, liftY: number, decayMs: number): void {
    this.speed = speed;
    this.dirX = dirX;
    this.liftY = liftY;
    this.decayMs = decayMs;
    this.elapsedMs = 0;
    this.lifted = false;
  }

  get active(): boolean {
    return this.decayMs > 0 && this.elapsedMs < this.decayMs;
  }

  /**
   * Horizontal velocity to ADD this frame (px/s, already scaled by the linear 1→0
   * decay). Advances the decay clock. Returns 0 once expired.
   */
  step(deltaMs: number, impulseScale = 1): number {
    if (!this.active) {
      this.decayMs = 0;
      return 0;
    }
    const t = 1 - this.elapsedMs / this.decayMs; // 1 → 0, linear
    const dvx = this.speed * this.dirX * t * (deltaMs / 1000) * impulseScale;
    this.elapsedMs += deltaMs;
    return dvx;
  }

  /** One-shot vertical lift (px/s), returned once on the first read, else 0. */
  takeLift(): number {
    if (this.lifted || this.liftY === 0) return 0;
    this.lifted = true;
    return this.liftY;
  }
}
