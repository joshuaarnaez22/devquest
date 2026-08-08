import Phaser from 'phaser';
import { Depth } from '@config/Depth';
import { DISPLAY } from '@config/GameConstants';
import { Palette } from '@config/Palette';
import { ContentDatabase } from '@data/ContentDatabase';
import { FeelPlayer, ensurePlayerBoxTexture } from '@entities/player/FeelPlayer';
import { buildFeelTestLevel } from '@level/FeelTestLevel';
import { DEBUG_FONT_KEY, installDebugBitmapFont } from '@platform/DebugBitmapFont';
import { createGameplayRegistry } from '@systems/createGameplayRegistry';
import { FeelDebugReadout } from '@ui/FeelDebugReadout';
import type { SystemRegistry } from '@core/SystemRegistry';
import type { CharacterId } from '@data/CharacterTypes';
import type { InputSystem } from '@systems/InputSystem';

const HERO_HOTKEYS: readonly { readonly code: number; readonly id: CharacterId }[] = [
  { code: Phaser.Input.Keyboard.KeyCodes.F1, id: 'knight' },
  { code: Phaser.Input.Keyboard.KeyCodes.F2, id: 'samurai' },
  { code: Phaser.Input.Keyboard.KeyCodes.F3, id: 'ninja' },
  { code: Phaser.Input.Keyboard.KeyCodes.F4, id: 'wizard' },
];

/**
 * Minimal feel-prototype GameScene — grey box + vocabulary course + debug readout.
 * Checkpoint B (M1-T10) — grey box tints per FSM state.
 * M1-T13 — F1–F4 hot-swaps heroes from ContentDatabase.
 */
export class GameScene extends Phaser.Scene {
  private systems: SystemRegistry | undefined;
  private player: FeelPlayer | undefined;
  private readout: FeelDebugReadout | undefined;
  private content: ContentDatabase | undefined;
  private heroKeys: Phaser.Input.Keyboard.Key[] = [];

  constructor() {
    super('Game');
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.events.on(Phaser.Scenes.Events.POST_UPDATE, this.postUpdate, this);

    installDebugBitmapFont(this);
    ensurePlayerBoxTexture(this);

    const dbResult = ContentDatabase.create();
    if (!dbResult.ok) {
      const detail = dbResult.error.map(i => `${i.path}: ${i.message}`).join('; ');
      throw new Error(`ContentDatabase failed: ${detail}`);
    }
    this.content = dbResult.value;
    const validated = this.content.validateAll();
    if (!validated.ok) {
      throw new Error('ContentDatabase.validateAll failed');
    }

    this.systems = createGameplayRegistry();
    this.systems.init();
    const input = this.systems.get<InputSystem>('input');

    const level = buildFeelTestLevel(this);
    this.player = new FeelPlayer(this, level.spawn.x, level.spawn.y, input);
    this.player.setCharacter(this.content.character('samurai'));

    this.physics.add.collider(this.player, level.solids);
    this.physics.add.collider(this.player, level.softs);

    this.cameras.main.setBounds(0, 0, level.worldWidth, level.worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setRoundPixels(true);

    this.readout = new FeelDebugReadout(this);
    this.bindHeroHotkeys();

    this.add
      .bitmapText(
        4,
        DISPLAY.HEIGHT - 10,
        DEBUG_FONT_KEY,
        'A/D MOVE  SPACE JUMP  K DASH  F1-F4 HERO',
        6,
      )
      .setScrollFactor(0)
      .setDepth(Depth.DEBUG)
      .setTint(Palette.N5);
  }

  private bindHeroHotkeys(): void {
    const keyboard = this.input.keyboard;
    if (keyboard === null) return;
    this.heroKeys = HERO_HOTKEYS.map(h => keyboard.addKey(h.code));
  }

  private pollHeroHotkeys(): void {
    const content = this.content;
    const player = this.player;
    if (content === undefined || player === undefined) return;

    for (let i = 0; i < this.heroKeys.length; i++) {
      const key = this.heroKeys[i];
      const binding = HERO_HOTKEYS[i];
      if (key === undefined || binding === undefined) continue;
      if (!Phaser.Input.Keyboard.JustDown(key)) continue;
      player.setCharacter(content.character(binding.id));
    }
  }

  override update(time: number, delta: number): void {
    const systems = this.systems;
    const player = this.player;
    if (systems === undefined || player === undefined) return;

    this.pollHeroHotkeys();

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
      hero: player.displayName,
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
    this.heroKeys = [];
    this.readout?.destroy();
    this.readout = undefined;
    this.systems?.destroy();
    this.systems = undefined;
    this.player = undefined;
    this.content = undefined;
  }
}
