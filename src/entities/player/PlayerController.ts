import { FEEL, PHYSICS } from '@config/GameConstants';
import { approach } from '@entities/player/approach';
import type { InputFrame } from '@core/InputFrame';
import type { CharacterMovement } from '@entities/player/CharacterMovement';
import type { DashContext, DashResult } from '@entities/player/Dash';
import type { JumpContext, JumpResult } from '@entities/player/Jump';
import type { PlayerStateId } from '@entities/player/PlayerStateId';

/** Shared feel — docs/06-Characters.md §4.3. */
export const TURN_BOOST = 1.8;

/** Ground attack move penalty — docs/06 §4.3. */
export const ATTACK_MOVE_SCALE = 0.4;

/** Wall jump horizontal impulse — docs/06 §5.3 / §5.6. */
export const WALL_JUMP_PUSH = 150;

/** Horizontal input lock after wall jump — docs/06 §5.6. */
export const WALL_JUMP_LOCK_MS = 120;

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
  /** Guards variable jump cut — reset on every launch (docs/06 §5.4). */
  private jumpCutApplied = false;
  /** Last `jumpPressedAt` consumed by jump resolution (docs/06 §5.3). */
  private consumedJumpAt = 0;
  /** Active dash — gravity off, input ignored (docs/06 §5.5). */
  private dashing = false;
  private dashDir: -1 | 1 = 1;
  private dashEndsAt = 0;
  /** Absolute expiry — cooldown measured from dash *start*. */
  private dashCooldownUntil = 0;
  /** Latched until FSM leaves DASH. */
  private dashFinishedLatched = false;
  /** Absolute expiry — horizontal lock after wall jump (docs/06 §5.6). */
  private wallJumpLockUntil = 0;

  constructor(
    private readonly body: ControllerBody,
    private readonly def: CharacterMovement,
  ) {}

  /** Convert Phaser ms delta to seconds before apply* calls. */
  beginFrame(deltaMs: number): void {
    this.dt = deltaMs / 1000;
  }

  get isDashing(): boolean {
    return this.dashing;
  }

  /** Remaining cooldown ms (0 when ready). */
  dashCooldownRemainingMs(nowMs: number): number {
    return Math.max(0, this.dashCooldownUntil - nowMs);
  }

  /** True when cooldown elapsed and not mid-dash. */
  isDashCooldownReady(nowMs: number): boolean {
    return !this.dashing && nowMs >= this.dashCooldownUntil;
  }

  /** Landing refreshes cooldown for all heroes (docs/06 §5.5). */
  refreshDashCooldown(): void {
    this.dashCooldownUntil = 0;
  }

  /** True after dash duration ends until {@link clearDashFinished}. */
  get dashFinished(): boolean {
    return this.dashFinishedLatched;
  }

  clearDashFinished(): void {
    this.dashFinishedLatched = false;
  }

  isWallJumpLocked(nowMs: number): boolean {
    return nowMs < this.wallJumpLockUntil;
  }

  isWallJumpLockExpired(nowMs: number): boolean {
    return nowMs >= this.wallJumpLockUntil;
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

  /** Whether `jumpPressedAt` is still an unconsumed buffer stamp. */
  hasUnconsumedJumpBuffer(jumpPressedAt: number): boolean {
    return jumpPressedAt > 0 && jumpPressedAt !== this.consumedJumpAt;
  }

  /** Called every frame after the FSM has set intent. */
  applyHorizontal(input: InputFrame, state: PlayerStateId, grounded: boolean): void {
    if (this.dashing || this.skipsHorizontal(state)) return;

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
   * Clamp fall speed while sliding — docs/06 §6.2 / §5.6.
   * Call instead of {@link applyGravity} in WALL_SLIDE.
   */
  applyWallSlide(): void {
    const speed = this.def.wallSlideSpeed;
    this.trueVy = speed;
    this.body.velocity.y = speed;
  }

  /**
   * Dash start — docs/06 §5.5.
   * Cooldown is stamped from start; velocity locked for dashDurationMs.
   */
  tryDash(input: InputFrame, ctx: DashContext): DashResult {
    if (!input.dashPressed) {
      return { kind: 'blocked' };
    }
    if (this.dashing) {
      return { kind: 'blocked' };
    }
    const remaining = this.dashCooldownUntil - ctx.now;
    if (remaining > 0) {
      return { kind: 'onCooldown', remainingMs: remaining };
    }
    if (!ctx.grounded && !ctx.airDashAvailable) {
      return { kind: 'blocked' };
    }

    const dirX: -1 | 1 = input.moveX !== 0 ? input.moveX : ctx.facing;
    this.dashing = true;
    this.dashDir = dirX;
    this.dashEndsAt = ctx.now + this.def.dashDurationMs;
    this.dashCooldownUntil = ctx.now + this.def.dashCooldownMs;
    this.dashFinishedLatched = false;
    this.lockDashVelocity();
    return { kind: 'started', dirX };
  }

  /**
   * Hold dash velocity; end when duration elapses.
   * @returns true on the frame the dash ends (jump buffer should fire).
   */
  tickDash(nowMs: number): boolean {
    if (!this.dashing) return false;
    if (nowMs < this.dashEndsAt) {
      this.lockDashVelocity();
      return false;
    }
    this.dashing = false;
    this.dashFinishedLatched = true;
    this.trueVy = 0;
    this.body.velocity.y = 0;
    return true;
  }

  private lockDashVelocity(): void {
    this.body.velocity.x = this.dashDir * this.def.dashSpeed;
    this.trueVy = 0;
    this.body.velocity.y = 0;
  }

  /**
   * Variable jump cut — once per jump while rising (docs/06 §5.4).
   * Call before {@link applyGravity} while airborne.
   */
  applyJumpCut(input: InputFrame): void {
    if (input.jumpHeld || this.jumpCutApplied || this.trueVy >= 0) {
      return;
    }
    this.trueVy *= FEEL.VARIABLE_JUMP_CUT;
    this.body.velocity.y = this.trueVy;
    this.jumpCutApplied = true;
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
   * Buffer: `jumpPressed` or unconsumed `jumpPressedAt` within JUMP_BUFFER.
   * Successful jumps and grounded misses consume the press; airborne misses keep
   * the buffer for coyote / land (consume-on-contact).
   */
  tryJump(input: InputFrame, ctx: JumpContext): JumpResult {
    this.expireJumpBuffer(input, ctx.now);

    const pressAt = input.jumpPressedAt;
    const buffered =
      pressAt > 0 && ctx.now - pressAt <= FEEL.JUMP_BUFFER && pressAt !== this.consumedJumpAt;
    if (!input.jumpPressed && !buffered) {
      return { kind: 'none' };
    }

    if (ctx.grounded) {
      this.launchJump(this.def.jumpVelocity);
      this.consumeJump(pressAt);
      return { kind: 'ground' };
    }

    if (ctx.now < ctx.coyoteExpiresAt) {
      this.launchJump(this.def.jumpVelocity);
      this.consumeJump(pressAt);
      return { kind: 'coyote' };
    }

    if (ctx.onWall && ctx.wallDir !== 0) {
      const pushX = -ctx.wallDir * WALL_JUMP_PUSH;
      this.launchJump(this.def.jumpVelocity * 0.95);
      this.body.velocity.x = pushX;
      this.wallJumpLockUntil = ctx.now + WALL_JUMP_LOCK_MS;
      this.consumeJump(pressAt);
      return { kind: 'wall', pushX };
    }

    if (ctx.airJumpsRemaining > 0) {
      // vy = min(vy, 0) then set scaled air-jump velocity (docs/06 §5.3).
      this.trueVy = Math.min(this.trueVy, 0);
      this.launchJump(this.def.jumpVelocity * this.def.airJumpScale);
      this.consumeJump(pressAt);
      return { kind: 'air', remaining: ctx.airJumpsRemaining - 1 };
    }

    // Airborne miss — keep buffer for coyote / land; expiry consumes separately.
    return { kind: 'none' };
  }

  private expireJumpBuffer(input: InputFrame, nowMs: number): void {
    const pressAt = input.jumpPressedAt;
    if (pressAt > 0 && nowMs - pressAt > FEEL.JUMP_BUFFER) {
      this.consumeJump(pressAt);
    }
  }

  private consumeJump(pressAt: number): void {
    if (pressAt > 0) {
      this.consumedJumpAt = pressAt;
    }
  }

  private launchJump(vy: number): void {
    this.trueVy = vy;
    this.body.velocity.y = vy;
    this.jumpCutApplied = false;
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
