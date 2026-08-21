import { Palette } from '@config/Palette';
import type { SkeletonStateId } from '@entities/enemy/SkeletonStateId';

/** Read-only projection of Skeleton state for animators — no physics body, Pillar 1. */
export interface SkeletonSnapshot {
  readonly state: SkeletonStateId;
  readonly facing: -1 | 1;
  /** Layer 2 hit-flash colour (docs/07 §6.3), overriding the state tint while set. */
  readonly flashColour?: number | null;
}

/** Tintable surface — sprite only; never a physics body. */
export interface AnimatableSprite {
  setTintFill(colour: number): this;
  setFlipX(value: boolean): this;
}

/**
 * State -> solid fill, mirroring `PlayerAnimator.STATE_TINT`. `WINDUP` gets the
 * loudest colour in the set — docs/08 §5.2, "the telegraph" is the one state a
 * player must never miss reading.
 */
export const SKELETON_STATE_TINT: Readonly<Record<SkeletonStateId, number>> = {
  IDLE: Palette.N4,
  PATROL: Palette.N5,
  ALERT: Palette.S3,
  CHASE: Palette.C4,
  WINDUP: Palette.S1,
  ATTACK: Palette.S0,
  RECOVER: Palette.M3,
  HURT: Palette.W4,
  DEATH: Palette.N1,
};

/**
 * Read-only animator — mirrors `PlayerAnimator` exactly (docs/06 §10.1 pattern
 * applied to the Skeleton). `flashColour` overrides the state tint while set, so a
 * hit-flash and the base state colour never fight over `setTintFill`.
 */
export class SkeletonAnimator {
  constructor(private readonly sprite: AnimatableSprite) {}

  update(snap: Readonly<SkeletonSnapshot>): void {
    this.sprite.setTintFill(snap.flashColour ?? SKELETON_STATE_TINT[snap.state]);
    this.sprite.setFlipX(snap.facing === -1);
  }
}
