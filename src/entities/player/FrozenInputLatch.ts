import type { InputFrame } from '@core/InputFrame';

/**
 * Captures edge-triggered action presses that land while the player is frozen by
 * hit stop, so they are applied on the first unfrozen frame instead of silently
 * lost (docs/07-Combat.md P3, §6.2 — "the player must never feel that control was
 * taken away"). `Entity.onUpdate` (and everything it drives, including
 * `FeelPlayer.syncFsmHost`'s edge-triggered reads) is skipped entirely while
 * frozen, so `attackPressed`/`dashPressed`/`specialPressed` — each a one-frame
 * pulse in `InputFrame` — would otherwise never be observed. Jump does not need
 * this: it already survives via its own absolute-timestamp `JUMP_BUFFER`.
 */
export class FrozenInputLatch {
  private pendingAttack = false;
  private pendingDash = false;
  private pendingSpecial = false;

  /** Call every frame the owner is frozen (from `Entity.onFrozenTick`). */
  captureWhileFrozen(
    frame: Pick<InputFrame, 'attackPressed' | 'dashPressed' | 'specialPressed'>,
  ): void {
    if (frame.attackPressed) this.pendingAttack = true;
    if (frame.dashPressed) this.pendingDash = true;
    if (frame.specialPressed) this.pendingSpecial = true;
  }

  /**
   * Call once per real (unfrozen) frame. ORs in anything latched while frozen —
   * a fresh in-frame press still counts too — then clears the latch either way.
   */
  applyAndClear(actual: {
    readonly attack: boolean;
    readonly dash: boolean;
    readonly special: boolean;
  }): { readonly attack: boolean; readonly dash: boolean; readonly special: boolean } {
    const result = {
      attack: actual.attack || this.pendingAttack,
      dash: actual.dash || this.pendingDash,
      special: actual.special || this.pendingSpecial,
    };
    this.pendingAttack = false;
    this.pendingDash = false;
    this.pendingSpecial = false;
    return result;
  }
}
