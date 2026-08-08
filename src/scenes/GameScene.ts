import Phaser from 'phaser';
import { CAMERA } from '@config/CameraConstants';
import { Depth } from '@config/Depth';
import { DISPLAY } from '@config/GameConstants';
import { Palette } from '@config/Palette';
import { EventBus } from '@core/EventBus';
import { ContentDatabase } from '@data/ContentDatabase';
import { FeelPlayer, ensurePlayerBoxTexture } from '@entities/player/FeelPlayer';
import { buildFeelTestLevel } from '@level/FeelTestLevel';
import { DEBUG_FONT_KEY, installDebugBitmapFont } from '@platform/DebugBitmapFont';
import { createGameplayRegistry } from '@systems/createGameplayRegistry';
import { FeelDebugReadout } from '@ui/FeelDebugReadout';
import type { GameEventMap } from '@core/GameEvents';
import type { Profiler } from '@core/Profiler';
import type { SystemRegistry } from '@core/SystemRegistry';
import type { CharacterId } from '@data/CharacterTypes';
import type { CameraFollowTarget, CameraSystem } from '@systems/CameraSystem';
import type { DebugSystem } from '@systems/DebugSystem';
import type { InputSystem } from '@systems/InputSystem';
import type { ParticleSystem } from '@systems/ParticleSystem';
import type { PlayerVfxSource, VfxSystem } from '@systems/VfxSystem';

const HERO_HOTKEYS: readonly { readonly code: number; readonly id: CharacterId }[] = [
  { code: Phaser.Input.Keyboard.KeyCodes.F1, id: 'knight' },
  { code: Phaser.Input.Keyboard.KeyCodes.F2, id: 'samurai' },
  { code: Phaser.Input.Keyboard.KeyCodes.F3, id: 'ninja' },
  { code: Phaser.Input.Keyboard.KeyCodes.F4, id: 'wizard' },
];

/**
 * Feel-prototype GameScene — Checkpoint C + VFX + M1-T18 debug overlay.
 */
export class GameScene extends Phaser.Scene {
  private systems: SystemRegistry | undefined;
  private profiler: Profiler | undefined;
  private player: FeelPlayer | undefined;
  private readout: FeelDebugReadout | undefined;
  private content: ContentDatabase | undefined;
  private cameraSys: CameraSystem | undefined;
  private vfxSys: VfxSystem | undefined;
  private debugSys: DebugSystem | undefined;
  private bus: EventBus<GameEventMap> | undefined;
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

    this.bus = new EventBus<GameEventMap>();
    const gameplay = createGameplayRegistry();
    this.systems = gameplay.registry;
    this.profiler = gameplay.profiler;
    this.systems.init();
    const input = this.systems.get<InputSystem>('input');
    this.cameraSys = this.systems.get<CameraSystem>('camera');
    this.vfxSys = this.systems.get<VfxSystem>('vfx');
    this.debugSys = this.systems.get<DebugSystem>('debug');
    const particles = this.systems.get<ParticleSystem>('particles');

    const level = buildFeelTestLevel(this);
    this.player = new FeelPlayer({
      scene: this,
      x: level.spawn.x,
      y: level.spawn.y,
      frames: input,
      bus: this.bus,
    });
    this.player.setCharacter(this.content.character('samurai'));

    this.physics.add.collider(this.player, level.solids);
    this.physics.add.collider(this.player, level.softs);

    this.vfxSys.bind(this, this.bus);
    particles.bind(this);
    this.vfxSys.setSource(this.makeVfxSource(this.player, input));

    this.cameraSys.bind(this.cameras.main, level.worldWidth, level.worldHeight);
    this.cameraSys.setTarget(this.makeCameraTarget(this.player));
    this.cameraSys.snapToTarget();

    const vfx = this.vfxSys;
    this.debugSys.bind(this, {
      profiler: this.profiler,
      camera: this.cameras.main,
      pools: {
        dustStats: () => vfx.dustStats,
        afterimageStats: () => vfx.afterimageStats,
        particleStats: () => particles.stats,
      },
    });

    this.readout = new FeelDebugReadout(this);
    this.bindHeroHotkeys();

    this.add
      .bitmapText(
        4,
        CAMERA.VIEWPORT_H - 10,
        DEBUG_FONT_KEY,
        'A/D MOVE  SPACE JUMP  K DASH  F1-F4 HERO  Ctrl+Shift+D DBG',
        6,
      )
      .setScrollFactor(0)
      .setDepth(Depth.DEBUG)
      .setTint(Palette.N5);
  }

  private makeCameraTarget(player: FeelPlayer): CameraFollowTarget {
    return {
      get x() {
        return player.x;
      },
      get y() {
        return player.y;
      },
      get velocityX() {
        return player.velocityX;
      },
      get grounded() {
        return player.grounded;
      },
      get facing() {
        return player.facingDir;
      },
      get maxRunSpeed() {
        return player.runSpeed;
      },
    };
  }

  private makeVfxSource(player: FeelPlayer, input: InputSystem): PlayerVfxSource {
    return {
      get x() {
        return player.x;
      },
      get y() {
        return player.y;
      },
      get vx() {
        return player.velocityX;
      },
      get grounded() {
        return player.grounded;
      },
      get moveX() {
        return input.frame.moveX;
      },
      get facing() {
        return player.facingDir;
      },
      get scaleX() {
        return player.scaleX;
      },
      get scaleY() {
        return player.scaleY;
      },
      get flipX() {
        return player.flipX;
      },
      get textureKey() {
        return player.texture.key;
      },
    };
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
    const debug = this.debugSys;
    if (systems === undefined || player === undefined || debug === undefined) return;

    this.pollHeroHotkeys();

    const dt = Math.min(delta, DISPLAY.MAX_DELTA_MS);
    debug.pollHotkeys();
    debug.recordFrameMs(dt);

    if (!debug.allowsSimulation()) {
      this.physics.world.pause();
      debug.update(time, dt);
      return;
    }

    this.physics.world.resume();
    systems.update(time, dt);
    player.update(time, dt);
    player.syncAfterPhysics(time, dt);
    systems.postPhysics(time, dt);
  }

  private postUpdate(time: number, delta: number): void {
    const player = this.player;
    const readout = this.readout;
    const cameraSys = this.cameraSys;
    const debug = this.debugSys;
    if (player === undefined || readout === undefined || cameraSys === undefined) return;

    const dt = Math.min(delta, DISPLAY.MAX_DELTA_MS);
    cameraSys.syncFollow(dt);

    const body = player.body as Phaser.Physics.Arcade.Body;
    const snap = {
      hero: player.displayName,
      vx: body.velocity.x,
      vy: player.grounded ? 0 : player.controller.verticalVelocity,
      state: player.moveState,
      grounded: player.grounded,
      coyoteActive: player.coyoteActive,
      bufferActive: player.bufferActive,
      dashCooldownRemainingMs: player.dashCooldownRemainingMs,
      lastJumpHeight: player.lastJumpHeight,
    };
    readout.setVisible(debug === undefined || !debug.overlayVisible);
    if (debug === undefined || !debug.overlayVisible) {
      readout.sync(snap);
    }
    debug?.setPlayer({
      hero: snap.hero,
      state: snap.state,
      vx: snap.vx,
      vy: snap.vy,
      grounded: snap.grounded,
    });
    void time;
  }

  shutdown(): void {
    this.events.off(Phaser.Scenes.Events.POST_UPDATE, this.postUpdate, this);
    this.bus?.offAllFor(this);
    this.heroKeys = [];
    this.readout?.destroy();
    this.readout = undefined;
    this.systems?.destroy();
    this.systems = undefined;
    this.profiler = undefined;
    this.cameraSys = undefined;
    this.vfxSys = undefined;
    this.debugSys = undefined;
    this.bus = undefined;
    this.player = undefined;
    this.content = undefined;
  }
}
