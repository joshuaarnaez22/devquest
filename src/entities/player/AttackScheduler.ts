import { hitboxSpecFor, type AttackStep } from '@entities/player/AttackStep';
import type { Hitbox } from '@components/Hitbox';

/**
 * Drives one attack step's timing onto a Hitbox (docs/06 §11.2, docs/07 §5.1). `begin`
 * schedules the hitbox active window from `now`; the combo window opens at the end of the
 * active frames and lasts `comboWindowMs` (docs/06 §7.1.3); the step completes once
 * windup + active + recovery have elapsed.
 *
 * Pure: the owning entity calls `hitbox.update(now)` each frame and feeds `comboWindowOpen`
 * / `animComplete` into the player FSM host. Time-scheduled, never animation-frame-driven,
 * so retiming art cannot shift combat balance.
 */
export class AttackScheduler {
  private step: AttackStep | null = null;
  private startedAt = 0;

  /** Start an attack step: schedule its hitbox window and reset the phase clock. */
  begin(step: AttackStep, now: number, hitbox: Hitbox): void {
    this.step = step;
    this.startedAt = now;
    hitbox.schedule(now, step.windupMs, step.activeMs, hitboxSpecFor(step));
  }

  get active(): boolean {
    return this.step !== null;
  }

  get current(): AttackStep | null {
    return this.step;
  }

  /** Open from the end of the active frames for `comboWindowMs` (docs/06 §7.1.3). */
  comboWindowOpen(now: number): boolean {
    if (this.step === null) return false;
    const openAt = this.step.windupMs + this.step.activeMs;
    const elapsed = now - this.startedAt;
    return elapsed >= openAt && elapsed < openAt + this.step.comboWindowMs;
  }

  /** True once windup + active + recovery have elapsed. */
  animComplete(now: number): boolean {
    if (this.step === null) return false;
    const total = this.step.windupMs + this.step.activeMs + this.step.recoveryMs;
    return now - this.startedAt >= total;
  }

  end(): void {
    this.step = null;
  }
}
