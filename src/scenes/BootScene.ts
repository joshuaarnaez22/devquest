import Phaser from 'phaser';

/**
 * BootScene — registers services, loads boot assets (~40 KB).
 * docs/M0-T17 / docs/03 §7
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.scene.start('Preload');
  }

  shutdown(): void {
    // Tear down boot-only listeners/resources. Phaser does not call this for you.
  }
}
