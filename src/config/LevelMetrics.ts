// NORMATIVE — mirrors docs/10-Level-Design.md §5 / §11.

export const GAP = {
  STEP: 16,
  HOP: 24,
  GAP_S: 32,
  GAP_M: 40,
  GAP_L: 56,
  GAP_XL: 64,
  GAP_NINJA: 96,
} as const;

export const HEIGHT = {
  LEDGE_S: 16,
  LEDGE_M: 24,
  LEDGE_L: 26,
  LEDGE_XL: 40,
  SHAFT: 48,
  LEDGE_NINJA: 56,
} as const;

export const CLEARANCE = {
  CEIL_MIN: 32,
  CEIL_JUMP: 64,
  CEIL_COMBAT: 80,
  CORRIDOR_MIN: 32,
  CRAWL: 20,
} as const;

/** Worst-case hero capability. Main-path geometry must respect these. */
export const WORST_CASE = {
  jumpHeight: 28.1,
  runJumpDistance: 41.3,
  runJumpDash: 70.7,
  wallJumpChain: 50.0,
  SAFETY_MARGIN_H: 4,
  SAFETY_MARGIN_V: 2,
} as const;

export const PACING = {
  CHECKPOINT_MIN_PX: 400,
  CHECKPOINT_MAX_PX: 900,
  ENCOUNTER_MIN_SPACING_PX: 240,
  MAX_EMPTY_CORRIDOR_PX: 160,
  MAX_MOMENT_GAP_MS: 12_000,
} as const;
