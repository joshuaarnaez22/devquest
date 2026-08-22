import { DAMAGE_NUMBER_COLOUR, type DamageNumberStyle } from '@config/CombatFeedback';
import { Depth } from '@config/Depth';
import { ObjectPool } from '@core/ObjectPool';
import { Rng } from '@core/Rng';
import { DEBUG_FONT_KEY, installDebugBitmapFont } from '@platform/DebugBitmapFont';
import { damageNumberText, stackOffsetY } from '@systems/damageNumberRules';
import type { Vec2 } from '@core/GameEvents';
import type { Poolable } from '@core/ObjectPool';
import type { System } from '@core/SystemRegistry';
import type Phaser from 'phaser';

const POOL_INITIAL = 12;
const POOL_MAX = 20;
const RISE_PX = 12;
const RISE_MS = 500;
const FADE_MS = 200; // final portion of RISE_MS
const SPAWN_JITTER_X = 6; // +-, via Rng (ADR-019 — no Math.random)
const SPAWN_OFFSET_Y = 8; // fixed, not jittered (§6.8)
const STACK_PROXIMITY_PX = 8;
const STACK_OFFSET_PX = 10;

interface DamageNumber extends Poolable {
  readonly view: Phaser.GameObjects.BitmapText;
  lifeMs: number;
  startY: number;
}

/**
 * Layer 7 — damage numbers (docs/07-Combat.md §6.8). Implements
 * `CombatSinks.spawnDamageNumber`. Font: `devquest-6px`/`devquest-8px` do not exist
 * until M3's real atlas — this uses the existing M1 debug bitmap font (`debug`,
 * fixed 8px) as a placeholder for both, so the normal/critical size distinction is
 * not yet represented. Colour-coding by style IS real (`DAMAGE_NUMBER_COLOUR`).
 */
export class DamageNumberSystem implements System {
  readonly id = 'damageNumbers';
  enabled = true;

  private scene: Phaser.Scene | null = null;
  private pool: ObjectPool<DamageNumber> | null = null;
  private readonly live: DamageNumber[] = [];
  private readonly rng = new Rng(0xda3ae2);

  bind(scene: Phaser.Scene): void {
    this.scene = scene;
    installDebugBitmapFont(scene);
    this.pool = new ObjectPool(() => this.make(scene), POOL_INITIAL, POOL_MAX);
  }

  /** Debug overlay readout (docs/07 §11.4 — "live damage numbers"). */
  get liveCount(): number {
    return this.live.length;
  }

  /** `CombatSinks.spawnDamageNumber` — stacks against currently-live numbers (§6.8). */
  spawn(damage: number, point: Readonly<Vec2>, style: DamageNumberStyle): void {
    const pool = this.pool;
    if (pool === null) return;
    const n = pool.acquire();
    if (n === undefined) return;

    const jitterX = (this.rng.next() * 2 - 1) * SPAWN_JITTER_X;
    const x = point.x + jitterX;
    const liveCentres = this.live.filter(l => l !== n).map(l => ({ x: l.view.x, y: l.view.y }));
    const stackY = stackOffsetY(
      { x, y: point.y },
      liveCentres,
      STACK_PROXIMITY_PX,
      STACK_OFFSET_PX,
    );
    const y = point.y + SPAWN_OFFSET_Y + stackY;

    n.lifeMs = RISE_MS;
    n.startY = y;
    n.view.setText(damageNumberText(damage, style));
    n.view.setTint(DAMAGE_NUMBER_COLOUR[style]);
    n.view.setPosition(x, y);
    n.view.setAlpha(1);
    n.view.setVisible(true);
    n.view.setActive(true);
  }

  postPhysics(_time: number, delta: number): void {
    const pool = this.pool;
    if (pool === null) return;
    for (let i = this.live.length - 1; i >= 0; i--) {
      const n = this.live[i];
      if (n === undefined) continue;
      n.lifeMs -= delta;
      const elapsed = RISE_MS - n.lifeMs;
      const riseT = Math.min(1, elapsed / RISE_MS);
      const eased = 1 - (1 - riseT) * (1 - riseT); // Quad.easeOut
      n.view.y = n.startY - RISE_PX * eased;
      if (n.lifeMs <= FADE_MS) {
        n.view.setAlpha(Math.max(0, n.lifeMs / FADE_MS));
      }
      if (n.lifeMs <= 0) pool.release(n);
    }
  }

  destroy(): void {
    this.pool?.releaseAll();
    this.pool = null;
    this.live.length = 0;
    this.scene = null;
  }

  private make(scene: Phaser.Scene): DamageNumber {
    const view = scene.add.bitmapText(0, 0, DEBUG_FONT_KEY, '', 8);
    view.setOrigin(0.5, 1);
    view.setDepth(Depth.DAMAGE_NUMBER);
    view.setVisible(false);
    view.setActive(false);
    const self: DamageNumber = {
      view,
      lifeMs: 0,
      startY: 0,
      active: false,
      reset: () => {
        self.lifeMs = RISE_MS;
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
