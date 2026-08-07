import Phaser from 'phaser';
import { DISPLAY, PHYSICS } from '@config/GameConstants';

/** Phaser game config — NORMATIVE from docs/03-Technical-Architecture.md §11.1 */
export const PHASER_CONFIG: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  width: DISPLAY.WIDTH,
  height: DISPLAY.HEIGHT,
  parent: 'game-root',
  backgroundColor: '#0d0b14',

  pixelArt: true,
  antialias: false,
  roundPixels: true,
  powerPreference: 'high-performance',

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    autoRound: true,
    zoom: Phaser.Scale.MAX_ZOOM,
  },

  render: {
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    powerPreference: 'high-performance',
    batchSize: 4096,
    maxTextures: -1,
  },

  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: PHYSICS.GRAVITY_Y },
      tileBias: PHYSICS.TILE_BIAS,
      fps: 60,
      fixedStep: true,
      debug: import.meta.env.DEV,
      debugShowVelocity: false,
    },
  },

  fps: {
    target: DISPLAY.TARGET_FPS,
    forceSetTimeOut: false,
    smoothStep: true,
  },

  input: {
    gamepad: true,
    keyboard: true,
    mouse: { preventDefaultWheel: false },
  },

  disableContextMenu: true,
  banner: false,
  scene: [],
};
