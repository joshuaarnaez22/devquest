import { Depth } from '@config/Depth';
import { Palette } from '@config/Palette';
import { VFX } from '@config/VfxConstants';
import { ObjectPool } from '@core/ObjectPool';
import type { Poolable } from '@core/ObjectPool';
import type { System } from '@core/SystemRegistry';
import type Phaser from 'phaser';

interface Particle extends Poolable {
  readonly view: Phaser.GameObjects.Rectangle;
  lifeMs: number;
  maxLifeMs: number;
  vx: number;
  vy: number;
}

/**
 * Pooled micro-particles — skeleton for combat sparks (M2); M1 hosts the pool.
 * Cap 200 — docs/03 §10.1 / BUDGET.MAX_PARTICLES.
 */
export class ParticleSystem implements System {
  readonly id = 'particles';
  enabled = true;

  private pool: ObjectPool<Particle> | null = null;
  private readonly live: Particle[] = [];
  private factoryCalls = 0;

  bind(scene: Phaser.Scene): void {
    this.pool = new ObjectPool(
      () => {
        this.factoryCalls += 1;
        return this.make(scene);
      },
      VFX.PARTICLE_POOL_INITIAL,
      VFX.PARTICLE_POOL_MAX,
    );
  }

  get stats() {
    return this.pool?.stats ?? { free: 0, live: 0, peak: 0 };
  }

  get createdCount(): number {
    return this.factoryCalls;
  }

  /**
   * Spawn up to `count` particles at (x, y). Uses fixed cardinal velocities —
   * no Math.random (ADR-019); Rng wiring lands with combat sparks.
   */
  burst(_kind: string, x: number, y: number, count: number): void {
    const pool = this.pool;
    if (pool === null) return;
    const n = Math.min(count, 8);
    for (let i = 0; i < n; i++) {
      const p = pool.acquire();
      if (p === undefined) return;
      const angle = (i / n) * Math.PI * 2;
      p.vx = Math.cos(angle) * 40;
      p.vy = Math.sin(angle) * 40 - 20;
      p.maxLifeMs = 280;
      p.lifeMs = 280;
      p.view.setPosition(x, y);
      p.view.setAlpha(0.8);
      p.view.setVisible(true);
      p.view.setActive(true);
    }
  }

  postPhysics(_time: number, delta: number): void {
    const pool = this.pool;
    if (pool === null) return;
    const dt = delta / 1000;
    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i];
      if (p === undefined) continue;
      p.lifeMs -= delta;
      p.view.x += p.vx * dt;
      p.view.y += p.vy * dt;
      p.vy += 120 * dt;
      p.view.setAlpha(Math.max(0, p.lifeMs / p.maxLifeMs) * 0.8);
      if (p.lifeMs <= 0) pool.release(p);
    }
  }

  destroy(): void {
    this.pool?.releaseAll();
    this.pool = null;
    this.live.length = 0;
  }

  private make(scene: Phaser.Scene): Particle {
    const view = scene.add.rectangle(0, 0, 2, 2, Palette.N4, 1);
    view.setDepth(Depth.PARTICLE);
    view.setVisible(false);
    view.setActive(false);
    const self: Particle = {
      view,
      lifeMs: 0,
      maxLifeMs: 280,
      vx: 0,
      vy: 0,
      active: false,
      reset: () => {
        self.lifeMs = 280;
        this.live.push(self);
      },
      onDespawn: () => {
        view.setVisible(false);
        view.setActive(false);
        const idx = this.live.indexOf(self);
        if (idx >= 0) this.live.splice(idx, 1);
      },
    };
    return self;
  }
}
