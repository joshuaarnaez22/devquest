/** Dust / afterimage timings — docs/02 §5.3.2, docs/14 §8.4. */
export const VFX = {
  DUST_POOL_INITIAL: 24,
  DUST_POOL_MAX: 32,
  AFTERIMAGE_POOL_INITIAL: 9,
  AFTERIMAGE_POOL_MAX: 12,
  PARTICLE_POOL_INITIAL: 200,
  PARTICLE_POOL_MAX: 200,
  /** Slash/impact combat VFX (docs/07 §6.5) — a swing rarely overlaps more than a few. */
  SLASH_POOL_INITIAL: 6,
  SLASH_POOL_MAX: 12,

  RUN_DUST_INTERVAL_MS: 180,
  RUN_DUST_MIN_SPEED: 40,
  SKID_MIN_SPEED: 50,

  DUST_LIFE_MS: 220,
  DUST_SIZE: 4,

  AFTERIMAGE_COUNT: 3,
  AFTERIMAGE_SPACING_MS: 60,
  AFTERIMAGE_FADE_MS: 180,
  AFTERIMAGE_START_ALPHA: 0.5,
  /** Palette C5 — docs/14 §8.4. */
  AFTERIMAGE_TINT: 0x8bb4d4,
} as const;
