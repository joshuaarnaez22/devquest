import { Depth } from '@config/Depth';
import { FEEL } from '@config/GameConstants';
import { Entity } from '@entities/Entity';
import { SAMURAI_MOVEMENT } from '@entities/player/CharacterMovement';
import { PlayerController } from '@entities/player/PlayerController';
import { now } from '@platform/Clock';
import type { InputFrame, InputFrameSource } from '@core/InputFrame';
import type { PlayerStateId } from '@entities/player/PlayerStateId';
import type Phaser from 'phaser';

const BODY_W = 14;
const BODY_H = 28;

export class FeelPlayer extends Entity {
  readonly controller: PlayerController;
  grounded = false;
  /** Player FSM id — not Phaser GameObject.state. */
  moveState: PlayerStateId = 'IDLE';
  coyoteActive = false;
  bufferActive = false;
  dashCooldownRemainingMs = 0;
  lastJumpHeight = 0;

  private readonly frames: InputFrameSource;
  private jumpOriginY: number | null = null;
  private airJumpsRemaining = SAMURAI_MOVEMENT.airJumps;
  private coyoteExpiresAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, frames: InputFrameSource) {
    super(scene, x, y, 'player-box');
    this.frames = frames;
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(BODY_W, BODY_H);
    body.setCollideWorldBounds(true);
    body.setAllowGravity(false);
    body.setMaxVelocity(SAMURAI_MOVEMENT.runSpeed * 1.5, 400);
    this.controller = new PlayerController(body, SAMURAI_MOVEMENT);
    this.setDepth(Depth.PLAYER);
    this.setActive(true);
    this.setVisible(true);
  }

  protected override onUpdate(_time: number, delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const wasGrounded = this.grounded;
    this.grounded = body.blocked.down || body.touching.down;
    const frame = this.frames.frame;
    const t = now();

    this.resolveGroundTransitions(wasGrounded, body.y);
    this.controller.beginFrame(delta);
    this.resolveJump(frame, t, body.y);
    this.updateMoveState(frame);
    this.controller.applyHorizontal(frame, this.moveState, this.grounded);
    this.applyVertical(body.y);

    this.coyoteActive = !this.grounded && t < this.coyoteExpiresAt;
    this.bufferActive =
      frame.jumpPressedAt > 0 &&
      t - frame.jumpPressedAt <= FEEL.JUMP_BUFFER &&
      !frame.jumpPressed;

    if (frame.moveX !== 0) {
      this.setFlipX(frame.moveX < 0);
    }
  }

  private resolveGroundTransitions(wasGrounded: boolean, y: number): void {
    if (this.grounded && !wasGrounded) {
      this.onLanded(y);
    }
    if (!this.grounded && wasGrounded) {
      this.jumpOriginY = y;
    }
  }

  private resolveJump(frame: InputFrame, t: number, y: number): void {
    const jump = this.controller.tryJump(frame, {
      grounded: this.grounded,
      coyoteExpiresAt: this.coyoteExpiresAt,
      airJumpsRemaining: this.airJumpsRemaining,
      onWall: false,
      wallDir: 0,
      now: t,
    });
    if (jump.kind === 'ground' || jump.kind === 'coyote') {
      this.grounded = false;
      this.airJumpsRemaining = SAMURAI_MOVEMENT.airJumps;
      this.coyoteExpiresAt = 0;
      this.jumpOriginY = y;
      this.moveState = 'JUMP';
    } else if (jump.kind === 'air') {
      this.airJumpsRemaining = jump.remaining;
      this.moveState = 'AIR_JUMP';
    }
  }

  private updateMoveState(frame: InputFrame): void {
    if (!this.grounded) {
      if (this.controller.verticalVelocity < 0) {
        this.moveState = this.moveState === 'AIR_JUMP' ? 'AIR_JUMP' : 'JUMP';
      } else {
        this.moveState = 'FALL';
      }
      return;
    }
    this.moveState = frame.moveX !== 0 ? 'RUN' : 'IDLE';
  }

  private applyVertical(y: number): void {
    if (this.grounded) {
      this.controller.setVerticalVelocity(0);
      this.airJumpsRemaining = SAMURAI_MOVEMENT.airJumps;
      return;
    }
    this.controller.applyGravity();
    if (this.jumpOriginY !== null) {
      const height = this.jumpOriginY - y;
      if (height > this.lastJumpHeight) {
        this.lastJumpHeight = height;
      }
    }
  }

  private onLanded(y: number): void {
    if (this.jumpOriginY !== null) {
      this.lastJumpHeight = Math.max(0, this.jumpOriginY - y);
      this.jumpOriginY = null;
    }
    this.controller.setVerticalVelocity(0);
  }
}

export function ensurePlayerBoxTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists('player-box')) return;
  const g = scene.make.graphics({ x: 0, y: 0 });
  g.fillStyle(0x9a97a6, 1);
  g.fillRect(0, 0, BODY_W, BODY_H);
  g.generateTexture('player-box', BODY_W, BODY_H);
  g.destroy();
}
