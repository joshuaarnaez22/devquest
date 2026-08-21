import Phaser from 'phaser';
import { Depth } from '@config/Depth';
import { DISPLAY } from '@config/GameConstants';

const FLASH_MS = 200;
const PEAK_ALPHA = 0.25;

/**
 * Player-damage feedback (M2-T10 plan text, not one of the 9 enemy-hit layers):
 * a 200ms red screen flash, additive at 25%, fading linearly to 0. Split out of
 * `VfxSystem.ts` to keep that file under the length budget.
 */
export class DamageVignette {
  private view: Phaser.GameObjects.Rectangle | null = null;
  private lifeMs = 0;

  create(scene: Phaser.Scene): void {
    const view = scene.add.rectangle(0, 0, DISPLAY.WIDTH, DISPLAY.HEIGHT, 0xff0000, 1);
    view.setOrigin(0, 0);
    view.setScrollFactor(0);
    view.setBlendMode(Phaser.BlendModes.ADD);
    view.setDepth(Depth.SCREEN_FLASH);
    view.setAlpha(0);
    this.view = view;
  }

  flash(): void {
    if (this.view === null) return;
    this.lifeMs = FLASH_MS;
    this.view.setAlpha(PEAK_ALPHA);
  }

  tick(deltaMs: number): void {
    if (this.view === null || this.lifeMs <= 0) return;
    this.lifeMs -= deltaMs;
    this.view.setAlpha(Math.max(0, (this.lifeMs / FLASH_MS) * PEAK_ALPHA));
  }

  destroy(): void {
    this.view?.destroy();
    this.view = null;
  }
}
