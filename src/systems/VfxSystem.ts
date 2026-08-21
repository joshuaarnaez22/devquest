import { type VfxId } from '@config/CombatFeedback';
import { Depth } from '@config/Depth';
import { Palette } from '@config/Palette';
import { VFX } from '@config/VfxConstants';
import { ObjectPool } from '@core/ObjectPool';
import { DamageVignette } from '@systems/DamageVignette';
import { SlashVfx } from '@systems/SlashVfx';
import {
  afterimageOffsetsMs,
  landDustKind,
  landDustScale,
  shouldEmitRunDust,
  shouldEmitSkid,
  type DustKind,
} from '@systems/vfxRules';
import type { EventBus } from '@core/EventBus';
import type { GameEventMap, Vec2 } from '@core/GameEvents';
import type { Poolable } from '@core/ObjectPool';
import type { System } from '@core/SystemRegistry';
import type Phaser from 'phaser';

/** Feet / motion sample for continuous dust (run trail, skid). */
export interface PlayerVfxSource {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly grounded: boolean;
  readonly moveX: -1 | 0 | 1;
  readonly facing: -1 | 1;
  readonly scaleX: number;
  readonly scaleY: number;
  readonly flipX: boolean;
  readonly textureKey: string;
}

interface DustSprite extends Poolable {
  readonly view: Phaser.GameObjects.Rectangle;
  lifeMs: number;
  maxLifeMs: number;
}

interface GhostSprite extends Poolable {
  readonly view: Phaser.GameObjects.Image;
  lifeMs: number;
}

interface DeathFlashSprite extends Poolable {
  readonly view: Phaser.GameObjects.Arc;
  lifeMs: number;
}

interface PendingAfterimage {
  dueInMs: number;
  x: number;
  y: number;
  flipX: boolean;
  scaleX: number;
  scaleY: number;
  textureKey: string;
}

/**
 * Pooled dust + dash afterimages — docs/02 §5.3.2, docs/14 §8.4, M1-T17.
 * Grey placeholders until M3 atlases.
 */
export class VfxSystem implements System {
  readonly id = 'vfx';
  enabled = true;

  private scene: Phaser.Scene | null = null;
  private bus: EventBus<GameEventMap> | null = null;
  private source: PlayerVfxSource | null = null;
  private dustPool: ObjectPool<DustSprite> | null = null;
  private ghostPool: ObjectPool<GhostSprite> | null = null;
  private deathFlashPool: ObjectPool<DeathFlashSprite> | null = null;
  private readonly dustLive: DustSprite[] = [];
  private readonly ghostLive: GhostSprite[] = [];
  private readonly deathFlashLive: DeathFlashSprite[] = [];
  private readonly pendingGhosts: PendingAfterimage[] = [];
  private runDustMs = 0;
  private wasSkidding = false;
  private textureReady = false;
  private readonly vignette = new DamageVignette();
  private readonly slash = new SlashVfx();

  bind(scene: Phaser.Scene, bus: EventBus<GameEventMap>): void {
    this.scene = scene;
    this.bus = bus;
    this.ensureTextures(scene);
    this.vignette.create(scene);
    bus.on('combat:playerDamaged', () => this.vignette.flash(), this);
    this.slash.bind(scene);
    this.dustPool = new ObjectPool(
      () => this.makeDust(scene),
      VFX.DUST_POOL_INITIAL,
      VFX.DUST_POOL_MAX,
    );
    this.ghostPool = new ObjectPool(
      () => this.makeGhost(scene),
      VFX.AFTERIMAGE_POOL_INITIAL,
      VFX.AFTERIMAGE_POOL_MAX,
    );
    this.deathFlashPool = new ObjectPool(
      () => this.makeDeathFlash(scene),
      VFX.DEATH_FLASH_POOL_INITIAL,
      VFX.DEATH_FLASH_POOL_MAX,
    );

    bus.on('player:jumped', p => this.spawnDust('dust_jump', p.x, p.y), this);
    bus.on('player:landed', p => this.onLanded(p.impactSpeed, p.x, p.y), this);
    bus.on('player:dashed', p => this.queueAfterimages(p), this);
  }

  setSource(source: PlayerVfxSource | null): void {
    this.source = source;
  }

  get dustStats() {
    return this.dustPool?.stats ?? { free: 0, live: 0, peak: 0 };
  }

  get afterimageStats() {
    return this.ghostPool?.stats ?? { free: 0, live: 0, peak: 0 };
  }

  postPhysics(_time: number, delta: number): void {
    this.tickDust(delta);
    this.tickGhosts(delta);
    this.slash.tick(delta);
    this.tickDeathFlashes(delta);
    this.tickPendingGhosts(delta);
    this.tickContinuousDust(delta);
    this.vignette.tick(delta);
  }

  destroy(): void {
    this.bus?.offAllFor(this);
    this.dustPool?.releaseAll();
    this.ghostPool?.releaseAll();
    this.deathFlashPool?.releaseAll();
    this.dustPool = null;
    this.ghostPool = null;
    this.deathFlashPool = null;
    this.dustLive.length = 0;
    this.ghostLive.length = 0;
    this.deathFlashLive.length = 0;
    this.pendingGhosts.length = 0;
    this.vignette.destroy();
    this.slash.destroy();
    this.scene = null;
    this.bus = null;
    this.source = null;
  }

  /**
   * Layer 9 (partial) — the death radial flash (docs/07 §6.10): a 200ms white circle
   * at 20% alpha, expanding from 8px to 40px. The rest of §6.10 (explosion VFX,
   * material particles x3, coin scatter, death animation) needs a real enemy with
   * drops/animation (M2-T9+) and is not built here.
   */
  spawnDeathFlash(point: Readonly<Vec2>): void {
    const pool = this.deathFlashPool;
    if (pool === null) return;
    const fx = pool.acquire();
    if (fx === undefined) return;
    fx.lifeMs = 200;
    fx.view.setPosition(point.x, point.y);
    fx.view.setRadius(8);
    fx.view.setVisible(true);
    fx.view.setActive(true);
  }

  /** Layer 4 — slash/impact VFX (docs/07 §6.5), delegated to `SlashVfx`. */
  spawnSlash(vfxId: VfxId, point: Readonly<Vec2>, angleDeg: number): void {
    this.slash.spawn(vfxId, point, angleDeg);
  }

  /** Test / debug — force a dust puff without the bus. */
  spawnDust(kind: DustKind, x: number, y: number, scale = 1): void {
    const pool = this.dustPool;
    if (pool === null) return;
    const puff = pool.acquire();
    if (puff === undefined) return;
    puff.maxLifeMs = VFX.DUST_LIFE_MS;
    puff.lifeMs = VFX.DUST_LIFE_MS;
    const size = VFX.DUST_SIZE * scale;
    puff.view.setPosition(x, y);
    puff.view.setSize(size, size * 0.75);
    puff.view.setAlpha(kind === 'dust_run' ? 0.45 : 0.7);
    puff.view.setVisible(true);
    puff.view.setActive(true);
  }

  private onLanded(impactSpeed: number, x: number, y: number): void {
    const kind = landDustKind(impactSpeed);
    this.spawnDust(kind, x, y, landDustScale(kind));
  }

  private tickContinuousDust(delta: number): void {
    const src = this.source;
    if (src === null) return;

    if (shouldEmitSkid(src.grounded, src.moveX, src.vx)) {
      if (!this.wasSkidding) {
        this.spawnDust('dust_skid', src.x, src.y, 1.1);
      }
      this.wasSkidding = true;
    } else {
      this.wasSkidding = false;
    }

    if (!src.grounded || Math.abs(src.vx) <= VFX.RUN_DUST_MIN_SPEED) {
      this.runDustMs = 0;
      return;
    }
    this.runDustMs += delta;
    if (shouldEmitRunDust(src.grounded, Math.abs(src.vx), this.runDustMs)) {
      this.runDustMs = 0;
      this.spawnDust('dust_run', src.x, src.y);
    }
  }

  private queueAfterimages(p: GameEventMap['player:dashed']): void {
    for (const dueInMs of afterimageOffsetsMs()) {
      this.pendingGhosts.push({
        dueInMs,
        x: p.x,
        y: p.y,
        flipX: p.flipX,
        scaleX: p.scaleX,
        scaleY: p.scaleY,
        textureKey: p.textureKey,
      });
    }
  }

  private tickPendingGhosts(delta: number): void {
    for (let i = this.pendingGhosts.length - 1; i >= 0; i--) {
      const item = this.pendingGhosts[i];
      if (item === undefined) continue;
      item.dueInMs -= delta;
      if (item.dueInMs > 0) continue;
      this.pendingGhosts.splice(i, 1);
      this.spawnAfterimage(item);
    }
  }

  private spawnAfterimage(item: PendingAfterimage): void {
    const pool = this.ghostPool;
    const scene = this.scene;
    if (pool === null || scene === null) return;
    const ghost = pool.acquire();
    if (ghost === undefined) return;
    ghost.lifeMs = VFX.AFTERIMAGE_FADE_MS;
    const key = scene.textures.exists(item.textureKey) ? item.textureKey : 'vfx-dust';
    ghost.view.setTexture(key);
    ghost.view.setPosition(item.x, item.y);
    ghost.view.setFlipX(item.flipX);
    ghost.view.setScale(item.scaleX, item.scaleY);
    ghost.view.setAlpha(VFX.AFTERIMAGE_START_ALPHA);
    ghost.view.setTint(VFX.AFTERIMAGE_TINT);
    ghost.view.setVisible(true);
    ghost.view.setActive(true);
  }

  private tickDust(delta: number): void {
    const pool = this.dustPool;
    if (pool === null) return;
    for (let i = this.dustLive.length - 1; i >= 0; i--) {
      const puff = this.dustLive[i];
      if (puff === undefined) continue;
      puff.lifeMs -= delta;
      const t = Math.max(0, puff.lifeMs / puff.maxLifeMs);
      puff.view.setAlpha(0.7 * t);
      puff.view.y -= delta * 0.02;
      if (puff.lifeMs <= 0) pool.release(puff);
    }
  }

  private tickGhosts(delta: number): void {
    const pool = this.ghostPool;
    if (pool === null) return;
    for (let i = this.ghostLive.length - 1; i >= 0; i--) {
      const ghost = this.ghostLive[i];
      if (ghost === undefined) continue;
      ghost.lifeMs -= delta;
      const t = Math.max(0, ghost.lifeMs / VFX.AFTERIMAGE_FADE_MS);
      ghost.view.setAlpha(VFX.AFTERIMAGE_START_ALPHA * t);
      if (ghost.lifeMs <= 0) pool.release(ghost);
    }
  }

  private tickDeathFlashes(delta: number): void {
    const pool = this.deathFlashPool;
    if (pool === null) return;
    for (let i = this.deathFlashLive.length - 1; i >= 0; i--) {
      const fx = this.deathFlashLive[i];
      if (fx === undefined) continue;
      fx.lifeMs -= delta;
      const t = Math.min(1, 1 - fx.lifeMs / 200); // 0 -> 1 over the 200ms window
      fx.view.setRadius(8 + (40 - 8) * t);
      if (fx.lifeMs <= 0) pool.release(fx);
    }
  }

  private makeDust(scene: Phaser.Scene): DustSprite {
    const view = scene.add.rectangle(0, 0, VFX.DUST_SIZE, VFX.DUST_SIZE * 0.75, Palette.N5, 0.7);
    view.setDepth(Depth.VFX_WORLD);
    view.setOrigin(0.5, 1);
    view.setVisible(false);
    view.setActive(false);
    const self: DustSprite = {
      view,
      lifeMs: 0,
      maxLifeMs: VFX.DUST_LIFE_MS,
      active: false,
      reset: () => {
        self.lifeMs = VFX.DUST_LIFE_MS;
        self.maxLifeMs = VFX.DUST_LIFE_MS;
        this.dustLive.push(self);
      },
      onDespawn: () => {
        view.setVisible(false);
        view.setActive(false);
        const i = this.dustLive.indexOf(self);
        if (i >= 0) this.dustLive.splice(i, 1);
      },
    };
    return self;
  }

  private makeDeathFlash(scene: Phaser.Scene): DeathFlashSprite {
    const view = scene.add.circle(0, 0, 8, 0xffffff, 0.2); // white, 20% alpha, per §6.10
    view.setDepth(Depth.SCREEN_FLASH);
    view.setVisible(false);
    view.setActive(false);
    const self: DeathFlashSprite = {
      view,
      lifeMs: 0,
      active: false,
      reset: () => {
        this.deathFlashLive.push(self);
      },
      onDespawn: () => {
        view.setVisible(false);
        view.setActive(false);
        const i = this.deathFlashLive.indexOf(self);
        if (i >= 0) this.deathFlashLive.splice(i, 1);
      },
    };
    return self;
  }

  private makeGhost(scene: Phaser.Scene): GhostSprite {
    const view = scene.add.image(0, 0, 'vfx-dust');
    view.setDepth(Depth.PLAYER - 1);
    view.setOrigin(0.5, 1);
    view.setVisible(false);
    view.setActive(false);
    const self: GhostSprite = {
      view,
      lifeMs: 0,
      active: false,
      reset: () => {
        self.lifeMs = VFX.AFTERIMAGE_FADE_MS;
        this.ghostLive.push(self);
      },
      onDespawn: () => {
        view.setVisible(false);
        view.setActive(false);
        const i = this.ghostLive.indexOf(self);
        if (i >= 0) this.ghostLive.splice(i, 1);
      },
    };
    return self;
  }

  private ensureTextures(scene: Phaser.Scene): void {
    if (this.textureReady) return;
    if (!scene.textures.exists('vfx-dust')) {
      const g = scene.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, VFX.DUST_SIZE, VFX.DUST_SIZE);
      g.generateTexture('vfx-dust', VFX.DUST_SIZE, VFX.DUST_SIZE);
      g.destroy();
    }
    this.textureReady = true;
  }
}
