import { destroyDomHud, setDomHudText, setDomHudVisible } from '@platform/DebugDomHud';

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
 * Live feel instrument — DOM monospace panel (readable on any display).
 */
export class FeelDebugReadout {
  constructor() {
    setDomHudVisible('feel', true);
  }

  sync(snap: FeelDebugSnapshot): void {
    setDomHudText(
      'feel',
      [
        `HERO  ${snap.hero}`,
        `VX ${snap.vx.toFixed(1).padStart(6)}   VY ${snap.vy.toFixed(1).padStart(6)}`,
        `STATE ${snap.state.padEnd(10)} GND ${snap.grounded ? 'Y' : 'N'}`,
        `COYOTE ${snap.coyoteActive ? 'Y' : 'N'}        BUF ${snap.bufferActive ? 'Y' : 'N'}`,
        `DASH CD ${snap.dashCooldownRemainingMs.toFixed(0).padStart(4)} ms`,
        `JUMP H  ${snap.lastJumpHeight.toFixed(1).padStart(5)} px`,
      ].join('\n'),
    );
  }

  setVisible(visible: boolean): void {
    setDomHudVisible('feel', visible);
  }

  destroy(): void {
    setDomHudVisible('feel', false);
    // Hint / perf may still be live — only clear feel text.
    setDomHudText('feel', '');
  }
}

/** Call from scene shutdown after all HUD consumers are gone. */
export function teardownFeelDebugDom(): void {
  destroyDomHud();
}
