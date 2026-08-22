import type Phaser from 'phaser';

const BODY_W = 14;
const BODY_H = 28;

/** Split out of `FeelPlayer.ts` (M2-T11, file-length budget). */
export function ensurePlayerBoxTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists('player-box')) {
    scene.textures.remove('player-box');
  }
  const g = scene.make.graphics({ x: 0, y: 0 });
  // White base so setTintFill reads as a solid state colour.
  g.fillStyle(0xffffff, 1);
  g.fillRect(0, 0, BODY_W, BODY_H);
  g.generateTexture('player-box', BODY_W, BODY_H);
  g.destroy();
}
