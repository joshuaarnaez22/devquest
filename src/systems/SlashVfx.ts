import Phaser from 'phaser';
import { VFX_VISUAL, type VfxId } from '@config/CombatFeedback';
import { Depth } from '@config/Depth';
import { Palette } from '@config/Palette';
import { VFX } from '@config/VfxConstants';
import { ObjectPool } from '@core/ObjectPool';
import type { Vec2 } from '@core/GameEvents';
import type { Poolable } from '@core/ObjectPool';

interface SlashSprite extends Poolable {
  readonly view: Phaser.GameObjects.Rectangle;
  lifeMs: number;
  maxLifeMs: number;
}

/**
 * Layer 4 — slash/impact VFX (docs/07 §6.5). Split out of `VfxSystem.ts` to keep
 * that file under the length budget. `point` is already the caller's pre-offset
 * spawn position (contact point shifted 40% toward the victim, computed by
 * `CombatSystem`) — this only draws at it. Grey placeholder rectangles (ADD-
 * blended) until M3 art; sizing/duration from `VFX_VISUAL`.
 */
export class SlashVfx {
  private pool: ObjectPool<SlashSprite> | null = null;
  private readonly live: SlashSprite[] = [];

  bind(scene: Phaser.Scene): void {
    this.pool = new ObjectPool(() => this.make(scene), VFX.SLASH_POOL_INITIAL, VFX.SLASH_POOL_MAX);
  }

  spawn(vfxId: VfxId, point: Readonly<Vec2>, angleDeg: number): void {
    const pool = this.pool;
    if (pool === null) return;
    const fx = pool.acquire();
    if (fx === undefined) return;
    const visual = VFX_VISUAL[vfxId];
    const lifeMs = (visual.frames / 60) * 1000;
    fx.maxLifeMs = lifeMs;
    fx.lifeMs = lifeMs;
    fx.view.setPosition(point.x, point.y);
    fx.view.setSize(visual.width, visual.height);
    fx.view.setAngle(angleDeg);
    fx.view.setAlpha(1);
    fx.view.setVisible(true);
    fx.view.setActive(true);
  }

  tick(deltaMs: number): void {
    const pool = this.pool;
    if (pool === null) return;
    for (let i = this.live.length - 1; i >= 0; i--) {
      const fx = this.live[i];
      if (fx === undefined) continue;
      fx.lifeMs -= deltaMs;
      fx.view.setAlpha(Math.max(0, fx.lifeMs / fx.maxLifeMs));
      if (fx.lifeMs <= 0) pool.release(fx);
    }
  }

  destroy(): void {
    this.pool?.releaseAll();
    this.pool = null;
    this.live.length = 0;
  }

  private make(scene: Phaser.Scene): SlashSprite {
    // Palette N7 as the grey-box placeholder fill; ADD blend per §6.5's table —
    // every row specifies it.
    const view = scene.add.rectangle(0, 0, 1, 1, Palette.N7, 1);
    view.setDepth(Depth.VFX_WORLD);
    view.setBlendMode(Phaser.BlendModes.ADD);
    view.setVisible(false);
    view.setActive(false);
    const self: SlashSprite = {
      view,
      lifeMs: 0,
      maxLifeMs: 0,
      active: false,
      reset: () => {
        this.live.push(self);
      },
      onDespawn: () => {
        view.setVisible(false);
        view.setActive(false);
        const i = this.live.indexOf(self);
        if (i >= 0) this.live.splice(i, 1);
      },
    };
    return self;
  }
}
