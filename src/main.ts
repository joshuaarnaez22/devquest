import Phaser from 'phaser';
import { PHASER_CONFIG } from '@config/PhaserConfig';
import { BootScene } from '@scenes/BootScene';
import { PreloadScene } from '@scenes/PreloadScene';

const config: Phaser.Types.Core.GameConfig = {
  ...PHASER_CONFIG,
  scene: [BootScene, PreloadScene],
};

new Phaser.Game(config);
