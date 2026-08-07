import Phaser from 'phaser';
import { PHASER_CONFIG } from '@config/PhaserConfig';
import { BootScene } from '@scenes/BootScene';
import { GameScene } from '@scenes/GameScene';
import { PreloadScene } from '@scenes/PreloadScene';

const config: Phaser.Types.Core.GameConfig = {
  ...PHASER_CONFIG,
  scene: [BootScene, PreloadScene, GameScene],
};

new Phaser.Game(config);
