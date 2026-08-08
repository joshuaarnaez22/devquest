/**
 * Squash / stretch presets — docs/14-Animation-Standards.md §8.1
 * (restates docs/02-Game-Pillars.md §5.3.3).
 */
export const SQUASH = {
  /** Maximum |scale − 1| — beyond this the pixel grid breaks. */
  MAX_DEFORM: 0.25,
  JUMP: {
    scaleX: 0.88,
    scaleY: 1.14,
    outMs: 80,
    backMs: 60,
    ease: 'Quad.easeOut',
  },
  FALL: {
    scaleX: 1.08,
    scaleY: 0.94,
    /** Sustained fall before squash begins. */
    afterMs: 300,
    inMs: 200,
    ease: 'Sine.easeInOut',
  },
  LAND_SOFT: {
    scaleX: 1.1,
    scaleY: 0.9,
    durationMs: 120,
    ease: 'Back.easeOut',
    maxImpactSpeed: 150,
  },
  LAND_MEDIUM: {
    scaleX: 1.16,
    scaleY: 0.86,
    durationMs: 140,
    ease: 'Back.easeOut',
  },
  LAND_HARD: {
    scaleX: 1.24,
    scaleY: 0.78,
    durationMs: 160,
    ease: 'Back.easeOut',
    minImpactSpeed: 250,
  },
} as const;

export type LandImpact = 'soft' | 'medium' | 'hard';
