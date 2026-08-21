import { Depth } from '@config/Depth';
import { FEEL } from '@config/GameConstants';
import { Hitbox } from '@components/Hitbox';
import { Entity } from '@entities/Entity';
import { AttackScheduler } from '@entities/player/AttackScheduler';
import { SAMURAI_AIR_ATTACK, SAMURAI_COMBO } from '@entities/player/CharacterCombat';
import { SAMURAI_MOVEMENT } from '@entities/player/CharacterMovement';
import { FrozenInputLatch } from '@entities/player/FrozenInputLatch';
import { PlayerAnimator } from '@entities/player/PlayerAnimator';
import { PlayerController, WALL_JUMP_PUSH } from '@entities/player/PlayerController';
import {
  createPlayerFsmHost,
  createPlayerStateMachine,
  tickPlayerFsm,
} from '@entities/player/PlayerStates';
import { SquashStretch } from '@entities/ProceduralAnim';
import { now } from '@platform/Clock';
import type { AttackStep } from '@components/AttackStep';
import type { EventBus } from '@core/EventBus';
import type { GameEventMap } from '@core/GameEvents';
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
  private readonly bus: EventBus<GameEventMap>;
  private readonly fsmHost: PlayerFsmHost;
  private readonly fsm: StateMachine<PlayerFsmHost, PlayerStateId>;
  private readonly animator: PlayerAnimator;
  private readonly squash: SquashStretch;
  /**
   * Attack scheduling (M2-T4). In M2 every hero swings the Samurai Blade Chain —
   * per-hero combos are authored later — so combat feel is tuned on the reference.
   */
  private readonly attack = new AttackScheduler();
  private readonly attackHitbox = new Hitbox();
  /** Attack/dash/special presses that land while frozen by hit stop (M2-T6, §6.2 P3). */
  private readonly frozenInput = new FrozenInputLatch();
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

  constructor(opts: {
    readonly scene: Phaser.Scene;
    readonly x: number;
    readonly y: number;
    readonly frames: InputFrameSource;
    readonly bus: EventBus<GameEventMap>;
  }) {
    super(opts.scene, opts.x, opts.y, 'player-box');
    this.frames = opts.frames;
    this.bus = opts.bus;
    // Bottom-centre — squash must not lift feet (docs/14 §8.1).
    this.setOrigin(0.5, 1);
    opts.scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(BODY_W, BODY_H, false);
    body.setOffset(0, 0);
    body.setCollideWorldBounds(true);
    body.setAllowGravity(false);
    this.controller = new PlayerController(body, this.movement);
    this.applyMaxVelocity(body);
    this.fsmHost = createPlayerFsmHost();
    this.fsm = createPlayerStateMachine(this.fsmHost, 'IDLE');
    this.animator = new PlayerAnimator(this);
    this.squash = new SquashStretch(this);
    this.animator.update({ state: 'IDLE', facing: 1, animPrefix: this.animPrefix });
    opts.scene.add.existing(this);
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

  get facingDir(): -1 | 1 {
    return this.facing;
  }

  get runSpeed(): number {
    return this.movement.runSpeed;
  }

  /** Horizontal body velocity for camera look-ahead. */
  get velocityX(): number {
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    return body?.velocity.x ?? 0;
  }

  /** While frozen, `onUpdate` never runs — latch the raw press so it is not lost. */
  protected override onFrozenTick(): void {
    this.frozenInput.captureWhileFrozen(this.frames.frame);
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
    this.squash.tick(delta, this.grounded, this.controller.verticalVelocity);
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
    this.bus.emit('player:dashed', {
      x: this.x,
      y: this.y,
      flipX: this.facing === -1,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
      textureKey: this.texture.key,
    });
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
    const prevId = this.fsm.id;
    tickPlayerFsm(this.fsm, { time, delta });
    this.updateAttack(prevId, t);
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
    this.squash.jump();
    this.bus.emit('player:jumped', {
      fromCoyote: jump.kind === 'coyote',
      x: this.x,
      y: this.y,
    });
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
    const impactSpeed = Math.max(0, this.controller.verticalVelocity);
    this.squash.land(impactSpeed);
    this.bus.emit('player:landed', { impactSpeed, x: this.x, y: this.y });
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
    // Input buffered during hit stop, never dropped (docs/07 §6.2, P3) — a press that
    // landed on a frozen frame (captured via onFrozenTick) is honored here exactly
    // once, on the first real frame after release.
    const buffered = this.frozenInput.applyAndClear({
      attack: frame.attackPressed,
      dash: frame.dashPressed,
      special: frame.specialPressed,
    });
    this.fsmHost.wantsDash = buffered.dash;
    this.fsmHost.wantsAttack = buffered.attack;
    this.fsmHost.wantsSpecial = buffered.special;
    this.fsmHost.downHeld = frame.moveY > 0;
    this.fsmHost.dashing = this.controller.isDashing;
    this.fsmHost.dashReady =
      this.controller.isDashCooldownReady(t) && (this.grounded || this.airDashAvailable);
    this.fsmHost.dashFinished = this.controller.dashFinished;
    this.fsmHost.wallJumpLockExpired = this.controller.isWallJumpLockExpired(t);
    // Attack timing (M2-T4). Idle scheduler reports both false, so non-attack
    // states — which ignore these — are unaffected.
    this.fsmHost.comboWindowOpen = this.attack.comboWindowOpen(t);
    this.fsmHost.animComplete = this.attack.animComplete(t);
    this.fsmHost.comboLength = SAMURAI_COMBO.length;
  }

  /** The AttackStep a given attack state runs, or null for non-attack states. */
  private attackStepFor(id: PlayerStateId): AttackStep | null {
    switch (id) {
      case 'ATTACK_1':
        return SAMURAI_COMBO[0] ?? null;
      case 'ATTACK_2':
        return SAMURAI_COMBO[1] ?? null;
      case 'ATTACK_3':
        return SAMURAI_COMBO[2] ?? null;
      case 'AIR_ATTACK':
        return SAMURAI_AIR_ATTACK;
      default:
        return null;
    }
  }

  /** Begin the scheduler on attack-state entry, advance its hitbox, end on exit. */
  private updateAttack(prevId: PlayerStateId, t: number): void {
    const step = this.attackStepFor(this.fsm.id);
    if (step !== null) {
      if (prevId !== this.fsm.id) this.attack.begin(step, t, this.attackHitbox);
      this.attackHitbox.update(t);
    } else if (this.attack.active) {
      this.attack.end();
    }
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
