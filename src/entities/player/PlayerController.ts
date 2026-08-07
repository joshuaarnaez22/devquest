import { approach } from '@entities/player/approach';
import type { InputFrame } from '@core/InputFrame';
import type { CharacterMovement } from '@entities/player/CharacterMovement';
import type { PlayerStateId } from '@entities/player/PlayerStateId';

/** Shared feel — docs/06-Characters.md §4.3. */
export const TURN_BOOST = 1.8;

/** Ground attack move penalty — docs/06 §4.3. */
export const ATTACK_MOVE_SCALE = 0.4;

/** Minimal body surface — Phaser Arcade Body satisfies this. */
export interface ControllerBody {
  velocity: { x: number; y: number };
}

/**
 * Shared movement controller — values come from CharacterMovement only.
 * docs/06-Characters.md §5.1
 */
export class PlayerController {
  private dt = 0;

  constructor(
    private readonly body: ControllerBody,
    private readonly def: CharacterMovement,
  ) {}

  /** Convert Phaser ms delta to seconds before apply* calls. */
  beginFrame(deltaMs: number): void {
    this.dt = deltaMs / 1000;
  }

  /** Called every frame after the FSM has set intent. */
  applyHorizontal(input: InputFrame, state: PlayerStateId, grounded: boolean): void {
    if (this.skipsHorizontal(state)) return;

    const wants = input.moveX;
    const v = this.body.velocity.x;
    const maxSpeed = this.def.runSpeed * this.speedScaleFor(state);

    if (wants === 0) {
      const decel = grounded ? this.def.groundDecel : this.def.airDecel;
      this.body.velocity.x = approach(v, 0, decel * this.dt);
      return;
    }

    const opposing = Math.sign(v) !== 0 && Math.sign(v) !== wants;
    const baseAccel = grounded ? this.def.groundAccel : this.def.airAccel;
    const accel = opposing ? baseAccel * TURN_BOOST : baseAccel;

    this.body.velocity.x = approach(v, wants * maxSpeed, accel * this.dt);
  }

  private skipsHorizontal(state: PlayerStateId): boolean {
    return state === 'DASH' || state === 'HURT' || state === 'DEATH' || state === 'WALL_JUMP';
  }

  private speedScaleFor(state: PlayerStateId): number {
    if (state === 'ATTACK_1' || state === 'ATTACK_2' || state === 'ATTACK_3') {
      return ATTACK_MOVE_SCALE;
    }
    if (state === 'CROUCH') return 0;
    return 1;
  }
}
