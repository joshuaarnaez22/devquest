import { Palette } from '@config/Palette';
import type { PlayerSnapshot } from '@entities/player/PlayerSnapshot';
import type { PlayerStateId } from '@entities/player/PlayerStateId';

/** Tintable surface — sprite only; never a physics body. */
export interface AnimatableSprite {
  setTintFill(topLeft?: number, topRight?: number, bottomLeft?: number, bottomRight?: number): this;
  setFlipX(value: boolean): this;
}

/**
 * State → solid fill for Checkpoint B grey-box readout (docs/06 §10.1).
 * Uses signal / ramp colours so FSM changes are obvious without sprites.
 */
export const STATE_TINT: Readonly<Record<PlayerStateId, number>> = {
  IDLE: Palette.N5,
  RUN: Palette.C5,
  JUMP: Palette.S3,
  AIR_JUMP: Palette.S4,
  FALL: Palette.W4,
  LAND: Palette.G4,
  WALL_SLIDE: Palette.C3,
  WALL_JUMP: Palette.C4,
  ATTACK_1: Palette.S1,
  ATTACK_2: Palette.S0,
  ATTACK_3: Palette.S0,
  AIR_ATTACK: Palette.S1,
  DASH: Palette.M4,
  SPECIAL: Palette.M3,
  CROUCH: Palette.N3,
  HURT: Palette.S0,
  DEATH: Palette.N1,
};

/**
 * Read-only animator — receives {@link PlayerSnapshot}, never touches body.
 * ESLint `MemberExpression[property.name='body']` enforces this on `*Animator.ts`.
 */
export class PlayerAnimator {
  private lastState: PlayerStateId | null = null;

  constructor(private readonly sprite: AnimatableSprite) {}

  update(snap: Readonly<PlayerSnapshot>): void {
    if (snap.state !== this.lastState) {
      // Fill (not multiply) — multiply on a grey texture barely reads.
      this.sprite.setTintFill(STATE_TINT[snap.state]);
      this.lastState = snap.state;
    }
    this.sprite.setFlipX(snap.facing === -1);
  }
}
