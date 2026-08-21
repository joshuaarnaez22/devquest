import type { PlayerStateId } from '@entities/player/PlayerStateId';

/**
 * Read-only projection of player state for animators.
 * Must not expose physics body — docs/06 §10.1 / Pillar 1.
 */
export interface PlayerSnapshot {
  readonly state: PlayerStateId;
  /** −1 face left, +1 face right. */
  readonly facing: -1 | 1;
  /** Animation key prefix, e.g. `samurai` — unused until art packs land. */
  readonly animPrefix: string;
  /** Layer 2 hit-flash colour (docs/07 §6.3), overriding the state tint while set. */
  readonly flashColour?: number | null;
}
