import { Depth } from '@config/Depth';
import { Palette } from '@config/Palette';
import { DEBUG_FONT_KEY, DEBUG_FONT_SIZE } from '@platform/DebugBitmapFont';
import type Phaser from 'phaser';

export interface FeelDebugSnapshot {
  readonly hero: string;
  readonly vx: number;
  readonly vy: number;
  readonly state: string;
  readonly grounded: boolean;
  readonly coyoteActive: boolean;
  readonly bufferActive: boolean;
  readonly dashCooldownRemainingMs: number;
  readonly lastJumpHeight: number;
}

/**
 * Live feel instrument — solid panel + native-size glyphs (no fractional scale).
 */
export class FeelDebugReadout {
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly text: Phaser.GameObjects.BitmapText;
  private readonly root: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    this.panel = scene.add.graphics().setScrollFactor(0);
    this.text = scene.add
      .bitmapText(4, 3, DEBUG_FONT_KEY, '', DEBUG_FONT_SIZE)
      .setTint(Palette.N7)
      .setScrollFactor(0);
    this.root = scene.add
      .container(2, 2, [this.panel, this.text])
      .setScrollFactor(0)
      .setDepth(Depth.DEBUG);
  }

  sync(snap: FeelDebugSnapshot): void {
    const lines = [
      `HERO ${snap.hero.toUpperCase()}`,
      `VX ${snap.vx.toFixed(0)}  VY ${snap.vy.toFixed(0)}`,
      `STATE ${snap.state}  GND ${snap.grounded ? 'Y' : 'N'}`,
      `COYOTE ${snap.coyoteActive ? 'Y' : 'N'}  BUF ${snap.bufferActive ? 'Y' : 'N'}`,
      `DASH CD ${snap.dashCooldownRemainingMs.toFixed(0)}  JUMP ${snap.lastJumpHeight.toFixed(0)}`,
    ];
    this.text.setText(lines.join('\n'));

    const w = Math.max(120, this.text.width + 8);
    const h = this.text.height + 6;
    this.panel.clear();
    this.panel.fillStyle(Palette.N0, 1);
    this.panel.fillRect(0, 0, w, h);
    this.panel.lineStyle(1, Palette.N3, 1);
    this.panel.strokeRect(0, 0, w, h);
  }

  setVisible(visible: boolean): void {
    this.root.setVisible(visible);
  }

  destroy(): void {
    this.root.destroy(true);
  }
}
