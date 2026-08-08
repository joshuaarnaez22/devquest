import Phaser from 'phaser';
import { Depth } from '@config/Depth';
import { DISPLAY } from '@config/GameConstants';
import { Palette } from '@config/Palette';
import { FeelPlayer, ensurePlayerBoxTexture } from '@entities/player/FeelPlayer';
import { buildFeelTestLevel } from '@level/FeelTestLevel';
import { DEBUG_FONT_KEY, installDebugBitmapFont } from '@platform/DebugBitmapFont';
import { createGameplayRegistry } from '@systems/createGameplayRegistry';
import { FeelDebugReadout } from '@ui/FeelDebugReadout';
import type { SystemRegistry } from '@core/SystemRegistry';
import type { InputSystem } from '@systems/InputSystem';

/**
 * Minimal feel-prototype GameScene — grey box + vocabulary course + debug readout.
 * Checkpoint A (M1-T5).
 */
export class GameScene extends Phaser.Scene {
  private systems: SystemRegistry | undefined;
  private player: FeelPlayer | undefined;
  private readout: FeelDebugReadout | undefined;

  constructor() {
    super('Game');
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.events.on(Phaser.Scenes.Events.POST_UPDATE, this.postUpdate, this);

    installDebugBitmapFont(this);
    ensurePlayerBoxTexture(this);

    this.systems = createGameplayRegistry();
    this.systems.init();
    const input = this.systems.get<InputSystem>('input');

    const level = buildFeelTestLevel(this);
    this.player = new FeelPlayer(this, level.spawn.x, level.spawn.y, input);

    this.physics.add.collider(this.player, level.solids);
    this.physics.add.collider(this.player, level.softs);

    this.cameras.main.setBounds(0, 0, level.worldWidth, level.worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setRoundPixels(true);

    this.readout = new FeelDebugReadout(this);

    this.add
      .bitmapText(4, DISPLAY.HEIGHT - 10, DEBUG_FONT_KEY, 'A/D MOVE', 6)
      .setScrollFactor(0)
      .setDepth(Depth.DEBUG)
      .setTint(Palette.N5);
  }

  override update(time: number, delta: number): void {
    const systems = this.systems;
    const player = this.player;
    if (systems === undefined || player === undefined) return;

    const dt = Math.min(delta, DISPLAY.MAX_DELTA_MS);
    systems.update(time, dt);
    player.update(time, dt);
    systems.postPhysics(time, dt);
  }

  /** After Arcade: grounded flags are valid; sync HUD. */
  private postUpdate(time: number, delta: number): void {
    const player = this.player;
    const readout = this.readout;
    if (player === undefined || readout === undefined) return;

    const dt = Math.min(delta, DISPLAY.MAX_DELTA_MS);
    player.syncAfterPhysics(time, dt);

    const body = player.body as Phaser.Physics.Arcade.Body;
    readout.sync({
      vx: body.velocity.x,
      // Stick velocity is an Arcade contact hack — HUD shows true vertical state.
      vy: player.grounded ? 0 : player.controller.verticalVelocity,
      state: player.moveState,
      grounded: player.grounded,
      coyoteActive: player.coyoteActive,
      bufferActive: player.bufferActive,
      dashCooldownRemainingMs: player.dashCooldownRemainingMs,
      lastJumpHeight: player.lastJumpHeight,
    });
  }

  shutdown(): void {
    this.events.off(Phaser.Scenes.Events.POST_UPDATE, this.postUpdate, this);
    this.readout?.destroy();
    this.readout = undefined;
    this.systems?.destroy();
    this.systems = undefined;
    this.player = undefined;
  }
}
