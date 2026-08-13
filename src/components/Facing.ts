/**
 * Horizontal facing: −1 (left) or +1 (right). Drives sprite flip and the sign of
 * hitbox/knockback offsets (docs/07-Combat.md §5, §6.4). A `moveX` of 0 keeps the
 * current facing — the entity does not snap to a default when input is released.
 */
export class Facing {
  private dir: -1 | 1;

  constructor(initial: -1 | 1 = 1) {
    this.dir = initial;
  }

  get value(): -1 | 1 {
    return this.dir;
  }

  get isLeft(): boolean {
    return this.dir === -1;
  }

  set(dir: -1 | 1): void {
    this.dir = dir;
  }

  /** Update from horizontal input or velocity; 0 keeps the current facing. */
  fromMove(moveX: number): void {
    if (moveX > 0) this.dir = 1;
    else if (moveX < 0) this.dir = -1;
  }

  flip(): void {
    this.dir = this.dir === 1 ? -1 : 1;
  }
}
