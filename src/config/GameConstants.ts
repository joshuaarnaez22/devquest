// NORMATIVE — mirrors docs/00-README.md §5. CI enforces parity via tools/docs/check-constants.ts.

export const DISPLAY = {
  WIDTH: 320,
  HEIGHT: 180,
  TILE: 16,
  TARGET_FPS: 60,
  MAX_DELTA_MS: 33.34,
} as const;

export const PHYSICS = {
  GRAVITY_Y: 900,
  MAX_FALL_SPEED: 300,
  FALL_GRAVITY_MULT: 1.35,
  APEX_GRAVITY_MULT: 0.7,
  APEX_THRESHOLD: 40,
  TILE_BIAS: 8,
} as const;

export const FEEL = {
  COYOTE_TIME: 100,
  JUMP_BUFFER: 120,
  VARIABLE_JUMP_CUT: 0.45,
  DASH_SPEED: 260,
  DASH_DURATION: 150,
  DASH_COOLDOWN: 500,
  PLAYER_IFRAME_MS: 800,
  IFRAME_FLICKER_MS: 100,
} as const;

export const FEEDBACK = {
  HITSTOP_LIGHT: 60,
  HITSTOP_HEAVY: 110,
  HITSTOP_KILL: 140,
  HITFLASH_MS: 80,
  SHAKE_LIGHT: { amplitude: 0.004, duration: 90 },
  SHAKE_HEAVY: { amplitude: 0.008, duration: 150 },
  KNOCKBACK_LIGHT: 70,
  KNOCKBACK_HEAVY: 140,
  KNOCKBACK_HEAVY_LIFT: -60,
} as const;

export const BUDGET = {
  FRAME_MS: 16.67,
  UPDATE_MS: 6,
  RENDER_MS: 6,
  MAX_DRAW_CALLS: 40,
  MAX_TEXTURE_MB: 128,
  MAX_ACTIVE_ENTITIES: 40,
  MAX_PARTICLES: 200,
} as const;
