import { SQUASH, type LandImpact } from '@config/SquashConstants';
import type Phaser from 'phaser';

export type { LandImpact };

export interface SquashPreset {
  readonly scaleX: number;
  readonly scaleY: number;
  readonly durationMs: number;
  readonly ease: string;
}

/** Impact tier from downward landing speed (px/s) — docs/14 §8.1. */
export function landImpactFromSpeed(downSpeedPxPerSec: number): LandImpact {
  if (downSpeedPxPerSec < SQUASH.LAND_SOFT.maxImpactSpeed) return 'soft';
  if (downSpeedPxPerSec > SQUASH.LAND_HARD.minImpactSpeed) return 'hard';
  return 'medium';
}

export function landPreset(impact: LandImpact): SquashPreset {
  switch (impact) {
    case 'soft':
      return {
        scaleX: SQUASH.LAND_SOFT.scaleX,
        scaleY: SQUASH.LAND_SOFT.scaleY,
        durationMs: SQUASH.LAND_SOFT.durationMs,
        ease: SQUASH.LAND_SOFT.ease,
      };
    case 'medium':
      return {
        scaleX: SQUASH.LAND_MEDIUM.scaleX,
        scaleY: SQUASH.LAND_MEDIUM.scaleY,
        durationMs: SQUASH.LAND_MEDIUM.durationMs,
        ease: SQUASH.LAND_MEDIUM.ease,
      };
    case 'hard':
      return {
        scaleX: SQUASH.LAND_HARD.scaleX,
        scaleY: SQUASH.LAND_HARD.scaleY,
        durationMs: SQUASH.LAND_HARD.durationMs,
        ease: SQUASH.LAND_HARD.ease,
      };
  }
}

/** True when both axes stay within ±MAX_DEFORM of identity. */
export function withinDeformBudget(scaleX: number, scaleY: number): boolean {
  const max = SQUASH.MAX_DEFORM;
  return Math.abs(scaleX - 1) <= max + 1e-9 && Math.abs(scaleY - 1) <= max + 1e-9;
}

/**
 * Procedural squash/stretch on a sprite — visual only; never gates FSM.
 * Origin must be bottom-centre or squash lifts the feet.
 */
export class SquashStretch {
  private tween: Phaser.Tweens.Tween | Phaser.Tweens.TweenChain | null = null;
  private fallMs = 0;
  private fallApplied = false;

  constructor(private readonly sprite: Phaser.GameObjects.Sprite) {}

  /** Call each frame while airborne / grounded to drive sustained-fall squash. */
  tick(deltaMs: number, grounded: boolean, vy: number): void {
    if (grounded || vy <= 0) {
      this.fallMs = 0;
      return;
    }
    this.fallMs += deltaMs;
    if (!this.fallApplied && this.fallMs >= SQUASH.FALL.afterMs) {
      this.fallApplied = true;
      this.applyHold(SQUASH.FALL.scaleX, SQUASH.FALL.scaleY, SQUASH.FALL.inMs, SQUASH.FALL.ease);
    }
  }

  jump(): void {
    this.fallApplied = false;
    this.fallMs = 0;
    this.stop();
    const { scaleX, scaleY, outMs, backMs, ease } = SQUASH.JUMP;
    this.tween = this.sprite.scene.tweens.chain({
      targets: this.sprite,
      tweens: [
        { scaleX, scaleY, duration: outMs, ease },
        { scaleX: 1, scaleY: 1, duration: backMs, ease },
      ],
      onComplete: () => {
        this.tween = null;
        this.sprite.setScale(1, 1);
      },
    });
  }

  land(downSpeedPxPerSec: number): void {
    this.fallApplied = false;
    this.fallMs = 0;
    const preset = landPreset(landImpactFromSpeed(downSpeedPxPerSec));
    this.applyRecover(preset.scaleX, preset.scaleY, preset.durationMs, preset.ease);
  }

  /** Snap to scale then ease back to identity (lands, hits). */
  applyRecover(sx: number, sy: number, durationMs: number, ease: string): void {
    this.stop();
    this.sprite.setScale(sx, sy);
    this.tween = this.sprite.scene.tweens.add({
      targets: this.sprite,
      scaleX: 1,
      scaleY: 1,
      duration: durationMs,
      ease,
      onComplete: () => {
        this.tween = null;
        this.sprite.setScale(1, 1);
      },
    });
  }

  /** Ease into a held deformation (sustained fall). */
  private applyHold(sx: number, sy: number, durationMs: number, ease: string): void {
    this.stop();
    this.tween = this.sprite.scene.tweens.add({
      targets: this.sprite,
      scaleX: sx,
      scaleY: sy,
      duration: durationMs,
      ease,
      onComplete: () => {
        this.tween = null;
      },
    });
  }

  private stop(): void {
    if (this.tween !== null) {
      this.tween.stop();
      this.tween = null;
    }
  }
}
