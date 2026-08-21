/**
 * Poise-intact stagger reaction (docs/07-Combat.md §6.7): "Flinch only — 100ms, the
 * enemy plays 2 frames of `hurt` but does not lose AI control." Distinct from a full
 * stagger (poise broken), which forces the victim's FSM to `HURT` instead — that
 * needs a real victim FSM (an enemy, M2-T9), so it is not modelled here. Pure timing
 * only; a caller (once animation exists, M3) reads `active` to hold the 2-frame pose.
 */
const FLINCH_MS = 100;

export class Flinch {
  private elapsedMs = Infinity; // inactive until the first start()

  start(): void {
    this.elapsedMs = 0;
  }

  update(deltaMs: number): void {
    if (!this.active) return;
    this.elapsedMs += deltaMs;
  }

  get active(): boolean {
    return this.elapsedMs < FLINCH_MS;
  }
}
