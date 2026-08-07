import Phaser from 'phaser';
import { Depth } from '@config/Depth';

/**
 * PreloadScene — phase-1 assets, progress bar.
 * docs/13-UI-UX.md §8.1 · M0-T17
 * Until TitleScene exists (M6), continue into Game (feel-test Checkpoint A).
 */
export class PreloadScene extends Phaser.Scene {
  private bar: Phaser.GameObjects.Rectangle | undefined;
  private finished = false;

  constructor() {
    super('Preload');
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);

    const w = this.scale.width;
    const h = this.scale.height;

    this.add.rectangle(w / 2, h / 2, w, h, 0x0d0b14).setDepth(Depth.MENU);

    this.add.rectangle(w / 2, h / 2, 160, 8, 0x2e2b40).setDepth(Depth.MENU);
    this.bar = this.add
      .rectangle(w / 2 - 80, h / 2, 0, 6, 0x5f8fb9)
      .setOrigin(0, 0.5)
      .setDepth(Depth.MENU);

    this.load.on('progress', (value: number) => {
      if (this.bar) this.bar.width = 160 * value;
    });

    const finish = (): void => {
      if (this.finished) return;
      this.finished = true;
      if (this.bar) this.bar.width = 160;
      console.warn('ready');
      // No Title yet — Boot → Preload → Game (feel-test). Title takes over in M6.
      this.scene.start('Game');
    };

    this.load.on('complete', finish);

    this.load.start();
    this.time.delayedCall(100, finish);
  }

  shutdown(): void {
    this.bar = undefined;
    this.finished = false;
  }
}
