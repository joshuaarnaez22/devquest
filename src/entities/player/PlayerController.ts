import { PHYSICS } from '@config/GameConstants';
import { approach } from '@entities/player/approach';
import type { InputFrame } from '@core/InputFrame';
import type { CharacterMovement } from '@entities/player/CharacterMovement';
import type { JumpContext, JumpResult } from '@entities/player/Jump';
import type { PlayerStateId } from '@entities/player/PlayerStateId';

/** Shared feel — docs/06-Characters.md §4.3. */
export const TURN_BOOST = 1.8;

/** Ground attack move penalty — docs/06 §4.3. */
export const ATTACK_MOVE_SCALE = 0.4;

/** Wall jump horizontal impulse — docs/06 §5.3 / §5.6. */
export const WALL_JUMP_PUSH = 150;

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
  /**
   * Authoritative vertical velocity for midpoint integration.
   * Phaser's position step uses the midpoint; this stores the post-step true vy
   * (spike-00 / plans/spike-00/results.md).
   */
  private trueVy = 0;

  constructor(
    private readonly body: ControllerBody,
    private readonly def: CharacterMovement,
  ) {}

  /** Convert Phaser ms delta to seconds before apply* calls. */
  beginFrame(deltaMs: number): void {
    this.dt = deltaMs / 1000;
  }

  /** Sync after landing / external velocity writes. */
  setVerticalVelocity(vy: number): void {
    this.trueVy = vy;
    this.body.velocity.y = vy;
  }

  /**
   * Keep Arcade reporting floor contact without feeding stick into gravity state.
   * `trueVy` stays 0; body gets a small downward speed for the next world step.
   */
  armGroundStick(stick: number): void {
    this.trueVy = 0;
    this.body.velocity.y = stick;
  }

  get verticalVelocity(): number {
    return this.trueVy;
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

  /**
   * Asymmetric gravity. Apex window uses **pre-step** vy.
   * Midpoint feed so Phaser `y += v·dt` matches continuous arc (~32 px).
   */
  applyGravity(): void {
    const vy0 = this.trueVy;
    let g = PHYSICS.GRAVITY_Y;
    if (vy0 > 0) {
      g *= PHYSICS.FALL_GRAVITY_MULT;
    } else if (Math.abs(vy0) < PHYSICS.APEX_THRESHOLD) {
      g *= PHYSICS.APEX_GRAVITY_MULT;
    }
    const vy1 = Math.min(vy0 + g * this.dt, PHYSICS.MAX_FALL_SPEED);
    this.trueVy = vy1;
    this.body.velocity.y = (vy0 + vy1) / 2;
  }

  /**
   * Jump resolution — first match wins (docs/06 §5.3).
   * Full coyote/buffer feel lands in M1-T8; ground jump is the S06 verify path.
   */
  tryJump(input: InputFrame, ctx: JumpContext): JumpResult {
    // Edge for now; buffer consume-on-land is M1-T8.
    if (!input.jumpPressed) {
      return { kind: 'none' };
    }

    if (ctx.grounded) {
      this.launchJump(this.def.jumpVelocity);
      return { kind: 'ground' };
    }

    if (ctx.now < ctx.coyoteExpiresAt) {
      this.launchJump(this.def.jumpVelocity);
      return { kind: 'coyote' };
    }

    if (ctx.onWall && ctx.wallDir !== 0) {
      const pushX = -ctx.wallDir * WALL_JUMP_PUSH;
      this.launchJump(this.def.jumpVelocity * 0.95);
      this.body.velocity.x = pushX;
      return { kind: 'wall', pushX };
    }

    if (ctx.airJumpsRemaining > 0) {
      // vy = min(vy, 0) then set scaled air-jump velocity (docs/06 §5.3).
      this.trueVy = Math.min(this.trueVy, 0);
      this.launchJump(this.def.jumpVelocity * this.def.airJumpScale);
      return { kind: 'air', remaining: ctx.airJumpsRemaining - 1 };
    }

    return { kind: 'none' };
  }

  private launchJump(vy: number): void {
    this.trueVy = vy;
    this.body.velocity.y = vy;
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
