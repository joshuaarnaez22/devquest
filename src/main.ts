import Phaser from 'phaser';
import { ProbeScene } from './ProbeScene';

new Phaser.Game({
  type: Phaser.WEBGL,
  width: 320,
  height: 180,
  parent: 'app',
  backgroundColor: '#1c1a2a',
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    autoRound: true,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 900 },
      tileBias: 8,
      fps: 60,
      fixedStep: true,
      debug: true,
    },
  },
  scene: [ProbeScene],
});
