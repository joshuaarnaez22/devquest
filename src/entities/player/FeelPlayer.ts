import { Depth } from '@config/Depth';
import { Entity } from '@entities/Entity';
import { SAMURAI_MOVEMENT } from '@entities/player/CharacterMovement';
import { PlayerController } from '@entities/player/PlayerController';
import type { InputFrameSource } from '@core/InputFrame';
import type { PlayerStateId } from '@entities/player/PlayerStateId';
import type Phaser from 'phaser';

const BODY_W = 14;
const BODY_H = 28;

export class FeelPlayer extends Entity {
  readonly controller: PlayerController;
  grounded = false;
  /** Player FSM id — not Phaser GameObject.state. */
  moveState: PlayerStateId = 'IDLE';
  /** Placeholders until coyote/buffer/dash/jump land in later M1 sessions. */
  coyoteActive = false;
  bufferActive = false;
  dashCooldownRemainingMs = 0;
  lastJumpHeight = 0;

  private readonly frames: InputFrameSource;

  constructor(scene: Phaser.Scene, x: number, y: number, frames: InputFrameSource) {
    super(scene, x, y, 'player-box');
    this.frames = frames;
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(BODY_W, BODY_H);
    body.setCollideWorldBounds(true);
    body.setMaxVelocity(SAMURAI_MOVEMENT.runSpeed * 1.5, 400);
    this.controller = new PlayerController(body, SAMURAI_MOVEMENT);
    this.setDepth(Depth.PLAYER);
    this.setActive(true);
    this.setVisible(true);
  }

  protected override onUpdate(_time: number, delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    this.grounded = body.blocked.down || body.touching.down;
    const frame = this.frames.frame;

    if (!this.grounded) {
      this.moveState = 'FALL';
    } else if (frame.moveX !== 0) {
      this.moveState = 'RUN';
    } else {
      this.moveState = 'IDLE';
    }

    this.controller.beginFrame(delta);
    this.controller.applyHorizontal(frame, this.moveState, this.grounded);

    if (frame.moveX !== 0) {
      this.setFlipX(frame.moveX < 0);
    }
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
