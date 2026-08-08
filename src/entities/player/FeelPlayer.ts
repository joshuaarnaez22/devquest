import { Depth } from '@config/Depth';
import { FEEL } from '@config/GameConstants';
import { Entity } from '@entities/Entity';
import { SAMURAI_MOVEMENT } from '@entities/player/CharacterMovement';
import { PlayerAnimator } from '@entities/player/PlayerAnimator';
import { PlayerController, WALL_JUMP_PUSH } from '@entities/player/PlayerController';
import {
  createPlayerFsmHost,
  createPlayerStateMachine,
  tickPlayerFsm,
} from '@entities/player/PlayerStates';
import { now } from '@platform/Clock';
import type { InputFrame, InputFrameSource } from '@core/InputFrame';
import type { StateMachine } from '@core/StateMachine';
import type { CharacterContent, CharacterId } from '@data/CharacterTypes';
import type { CharacterMovement } from '@entities/player/CharacterMovement';
import type { PlayerStateId } from '@entities/player/PlayerStateId';
import type { PlayerFsmHost } from '@entities/player/PlayerStates';
import type Phaser from 'phaser';

const BODY_W = 14;
const BODY_H = 28;

/**
 * Downward speed left on the body while grounded so the next Arcade step still
 * reports `blocked.down`. Custom gravity uses `allowGravity: false`; with vy=0,
 * floor contact flickers and jumps miss.
 *
 * Arcade `world.update` runs on Scene UPDATE (before Scene.update). Stick is
 * applied in {@link syncAfterPhysics} so it survives until that next step.
 */
const GROUND_STICK = 24;

function senseWallDir(body: Phaser.Physics.Arcade.Body): -1 | 0 | 1 {
  if (body.blocked.left || body.touching.left) return -1;
  if (body.blocked.right || body.touching.right) return 1;
  return 0;
}

export class FeelPlayer extends Entity {
  readonly controller: PlayerController;
  grounded = false;
  coyoteActive = false;
  bufferActive = false;
  dashCooldownRemainingMs = 0;
  lastJumpHeight = 0;
  characterId: CharacterId = 'samurai';
  displayName = 'Samurai';

  private readonly frames: InputFrameSource;
  private readonly fsmHost: PlayerFsmHost;
  private readonly fsm: StateMachine<PlayerFsmHost, PlayerStateId>;
  private readonly animator: PlayerAnimator;
  private movement: CharacterMovement = SAMURAI_MOVEMENT;
  private animPrefix = 'samurai';
  private facing: -1 | 1 = 1;
  private jumpOriginY: number | null = null;
  private airJumpsRemaining = SAMURAI_MOVEMENT.airJumps;
  /** One air dash per airborne period — docs/06 §5.5. */
  private airDashAvailable = true;
  private coyoteExpiresAt = 0;
  private jumpKind: PlayerFsmHost['jumpKind'] = null;
  private wallDir: -1 | 0 | 1 = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, frames: InputFrameSource) {
    super(scene, x, y, 'player-box');
    this.frames = frames;
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(BODY_W, BODY_H);
    body.setCollideWorldBounds(true);
    body.setAllowGravity(false);
    this.controller = new PlayerController(body, this.movement);
    this.applyMaxVelocity(body);
    this.fsmHost = createPlayerFsmHost();
    this.fsm = createPlayerStateMachine(this.fsmHost, 'IDLE');
    this.animator = new PlayerAnimator(this);
    this.animator.update({ state: 'IDLE', facing: 1, animPrefix: this.animPrefix });
    scene.add.existing(this);
    this.setDepth(Depth.PLAYER);
    this.setActive(true);
    this.setVisible(true);
  }

  /** Hot-swap hero from ContentDatabase (F1–F4). */
  setCharacter(content: CharacterContent): void {
    this.characterId = content.id;
    this.displayName = content.displayName;
    this.animPrefix = content.animPrefix;
    this.movement = content.movement;
    this.controller.setMovement(content.movement);
    this.airJumpsRemaining = content.movement.airJumps;
    this.airDashAvailable = true;
    this.controller.refreshDashCooldown();
    const body = this.body as Phaser.Physics.Arcade.Body;
    this.applyMaxVelocity(body);
    this.animator.update({
      state: this.fsm.id,
      facing: this.facing,
      animPrefix: this.animPrefix,
    });
  }

  private applyMaxVelocity(body: Phaser.Physics.Arcade.Body): void {
    const maxVx = Math.max(this.movement.dashSpeed, WALL_JUMP_PUSH, this.movement.runSpeed * 1.5);
    body.setMaxVelocity(maxVx, 400);
  }

  /** Current FSM id — docs/06 §6. */
  get moveState(): PlayerStateId {
    return this.fsm.id;
  }

  /**
   * Pre-display tick (after Arcade this frame): dash, jump, move, gravity.
   * Call {@link syncAfterPhysics} on Scene POST_UPDATE afterward.
   */
  protected override onUpdate(_time: number, delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const frame = this.frames.frame;
    const t = now();
    this.jumpKind = null;
    this.wallDir = senseWallDir(body);

    this.controller.beginFrame(delta);

    if (frame.moveX !== 0 && !this.controller.isWallJumpLocked(t)) {
      this.facing = frame.moveX;
    }

    // Dash outranks jump (docs/06 §6.3); jump during dash stays buffered.
    if (!this.controller.isDashing) {
      this.resolveDash(frame, t);
    }

    this.controller.tickDash(t);
    if (this.controller.isDashing) {
      // Velocity locked inside tickDash; no gravity / horizontal / jump.
    } else {
      this.resolveJump(frame, t, body.y);
      if (!this.controller.isWallJumpLocked(t)) {
        this.controller.applyHorizontal(frame, this.moveState, this.grounded);
      }
      this.applyVerticalMotion(frame);
    }

    this.coyoteActive = !this.grounded && t < this.coyoteExpiresAt;
    this.bufferActive = this.isBufferActive(frame, t);
    this.dashCooldownRemainingMs = this.controller.dashCooldownRemainingMs(t);
  }

  private applyVerticalMotion(frame: InputFrame): void {
    if (this.grounded) return;
    if (this.moveState === 'WALL_SLIDE') {
      this.controller.applyWallSlide();
      if (this.wallDir !== 0) {
        this.facing = this.wallDir === -1 ? 1 : -1;
      }
      return;
    }
    this.controller.applyJumpCut(frame);
    this.controller.applyGravity();
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.jumpOriginY !== null) {
      const height = this.jumpOriginY - body.y;
      if (height > this.lastJumpHeight) {
        this.lastJumpHeight = height;
      }
    }
  }

  private resolveDash(frame: InputFrame, t: number): void {
    const result = this.controller.tryDash(frame, {
      now: t,
      facing: this.facing,
      grounded: this.grounded,
      airDashAvailable: this.airDashAvailable,
    });
    if (result.kind !== 'started') return;

    this.coyoteExpiresAt = 0;
    if (!this.grounded) {
      this.airDashAvailable = false;
    }
  }

  /**
   * After Scene.update: refresh grounded from this frame's collision, then leave
   * ground-stick velocity for the next Arcade UPDATE.
   */
  syncAfterPhysics(time = 0, delta = 0): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const t = now();
    const frame = this.frames.frame;
    this.wallDir = senseWallDir(body);

    this.refreshGrounded(body, t);
    this.syncFsmHost(frame, t);
    tickPlayerFsm(this.fsm, { time, delta });
    if (this.fsm.id !== 'DASH') {
      this.controller.clearDashFinished();
    }
    this.animator.update({
      state: this.fsm.id,
      facing: this.facing,
      animPrefix: this.animPrefix,
    });
    this.jumpKind = null;
  }

  private refreshGrounded(body: Phaser.Physics.Arcade.Body, t: number): void {
    const wasGrounded = this.grounded;
    const rising = this.controller.verticalVelocity < 0;
    const onFloor = body.blocked.down || body.touching.down;
    this.grounded = !rising && onFloor;

    if (this.grounded && !wasGrounded) {
      this.onLanded(body.y, t);
    } else if (!this.grounded && wasGrounded && !rising) {
      this.jumpOriginY = body.y;
      this.coyoteExpiresAt = t + FEEL.COYOTE_TIME;
    }

    if (!this.grounded) return;
    this.airJumpsRemaining = this.movement.airJumps;
    this.airDashAvailable = true;
    // Keep stick during ground dash — vy=0 drops Arcade floor flags, then a
    // false re-land was calling refreshDashCooldown and wiping the remaining CD.
    this.controller.armGroundStick(GROUND_STICK);
  }

  private resolveJump(frame: InputFrame, t: number, y: number): void {
    const jump = this.controller.tryJump(frame, {
      grounded: this.grounded,
      coyoteExpiresAt: this.coyoteExpiresAt,
      airJumpsRemaining: this.airJumpsRemaining,
      onWall: this.canWallJump(frame, t),
      wallDir: this.wallDir,
      now: t,
    });
    this.applyJumpResult(jump, y);
  }

  /** Wall jump only while sliding / able to slide — docs/06 §5.6. */
  private canWallJump(frame: InputFrame, t: number): boolean {
    if (this.grounded || this.controller.isDashing) return false;
    if (this.controller.isWallJumpLocked(t)) return false;
    if (this.wallDir === 0) return false;
    if (this.moveState === 'WALL_SLIDE') return true;
    return frame.moveX === this.wallDir && this.controller.verticalVelocity > 0;
  }

  private applyJumpResult(jump: ReturnType<PlayerController['tryJump']>, y: number): void {
    if (jump.kind === 'none') return;
    this.jumpKind = jump.kind;
    if (jump.kind === 'ground' || jump.kind === 'coyote') {
      this.grounded = false;
      this.airJumpsRemaining = this.movement.airJumps;
      this.coyoteExpiresAt = 0;
      this.jumpOriginY = y;
    } else if (jump.kind === 'air') {
      this.airJumpsRemaining = jump.remaining;
      this.coyoteExpiresAt = 0;
    } else if (jump.kind === 'wall') {
      this.grounded = false;
      this.coyoteExpiresAt = 0;
      this.jumpOriginY = y;
      // Restores air jump + refreshes dash (docs/06 §5.6).
      this.airJumpsRemaining = this.movement.airJumps;
      this.airDashAvailable = true;
      this.controller.refreshDashCooldown();
    }
  }

  private onLanded(y: number, t: number): void {
    if (this.jumpOriginY !== null) {
      this.lastJumpHeight = Math.max(0, this.jumpOriginY - y);
      this.jumpOriginY = null;
    }
    this.controller.setVerticalVelocity(0);
    this.coyoteExpiresAt = 0;
    this.airDashAvailable = true;
    // Landing refresh is for returning from the air (docs/06 §5.5). A ground
    // dash must keep its start-based cooldown — do not clear mid-timer here
    // unless we actually left the ground (this method only runs on that edge).
    this.controller.refreshDashCooldown();

    const frame = this.frames.frame;
    const jump = this.controller.tryJump(frame, {
      grounded: true,
      coyoteExpiresAt: 0,
      airJumpsRemaining: this.airJumpsRemaining,
      onWall: false,
      wallDir: 0,
      now: t,
    });
    this.applyJumpResult(jump, y);
  }

  private syncFsmHost(frame: InputFrame, t: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const locked = this.controller.isWallJumpLocked(t);
    const onWall = !this.grounded && this.wallDir !== 0 && !this.controller.isDashing;
    const inputToWall = onWall && !locked && frame.moveX === this.wallDir && this.wallDir !== 0;

    this.fsmHost.grounded = this.grounded;
    this.fsmHost.moveX = frame.moveX;
    this.fsmHost.absVx = Math.abs(body.velocity.x);
    this.fsmHost.vy = this.controller.verticalVelocity;
    this.fsmHost.airJumpsRemaining = this.airJumpsRemaining;
    this.fsmHost.withinCoyote = !this.grounded && t < this.coyoteExpiresAt;
    this.fsmHost.onWall = onWall;
    this.fsmHost.inputToWall = inputToWall;
    this.fsmHost.jumpKind = this.jumpKind;
    this.fsmHost.bufferedJump = this.jumpKind === 'ground' || this.isBufferActive(frame, t);
    this.fsmHost.wantsDash = frame.dashPressed;
    this.fsmHost.wantsAttack = frame.attackPressed;
    this.fsmHost.wantsSpecial = frame.specialPressed;
    this.fsmHost.downHeld = frame.moveY > 0;
    this.fsmHost.dashing = this.controller.isDashing;
    this.fsmHost.dashReady =
      this.controller.isDashCooldownReady(t) && (this.grounded || this.airDashAvailable);
    this.fsmHost.dashFinished = this.controller.dashFinished;
    this.fsmHost.wallJumpLockExpired = this.controller.isWallJumpLockExpired(t);
  }

  private isBufferActive(frame: InputFrame, t: number): boolean {
    return (
      frame.jumpPressedAt > 0 &&
      t - frame.jumpPressedAt <= FEEL.JUMP_BUFFER &&
      !frame.jumpPressed &&
      this.controller.hasUnconsumedJumpBuffer(frame.jumpPressedAt)
    );
  }
}

export function ensurePlayerBoxTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists('player-box')) {
    scene.textures.remove('player-box');
  }
  const g = scene.make.graphics({ x: 0, y: 0 });
  // White base so setTintFill reads as a solid state colour.
  g.fillStyle(0xffffff, 1);
  g.fillRect(0, 0, BODY_W, BODY_H);
  g.generateTexture('player-box', BODY_W, BODY_H);
  g.destroy();
}
