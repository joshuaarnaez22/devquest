import { Depth } from '@config/Depth';
import { Palette } from '@config/Palette';
import { DEBUG_FONT_KEY } from '@platform/DebugBitmapFont';
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
 * Live feel instrument — vx/vy/state/grounded + placeholders for later M1 verbs.
 */
export class FeelDebugReadout {
  private readonly text: Phaser.GameObjects.BitmapText;

  constructor(scene: Phaser.Scene) {
    this.text = scene.add
      .bitmapText(4, 4, DEBUG_FONT_KEY, '', 6)
      .setScrollFactor(0)
      .setDepth(Depth.DEBUG)
      .setTint(Palette.N7);
  }

  sync(snap: FeelDebugSnapshot): void {
    const lines = [
      `HERO ${snap.hero}`,
      `VX ${snap.vx.toFixed(1)}  VY ${snap.vy.toFixed(1)}`,
      `STATE ${snap.state}  GND ${snap.grounded ? 'Y' : 'N'}`,
      `COYOTE ${snap.coyoteActive ? 'Y' : 'N'}  BUF ${snap.bufferActive ? 'Y' : 'N'}`,
      `DASH CD ${snap.dashCooldownRemainingMs.toFixed(0)}  JUMP H ${snap.lastJumpHeight.toFixed(1)}`,
    ];
    this.text.setText(lines.join('\n'));
  }

  destroy(): void {
    this.text.destroy();
  }
}
