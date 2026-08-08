/** Camera tuning — docs/04-Art-Direction.md §10.2 + M1-T15 plan. */

export const CAMERA = {
  LERP: 0.12,
  DEADZONE_W: 48,
  DEADZONE_H: 32,
  /** Bias view upward — players jump more than they fall. */
  FOLLOW_OFFSET_Y: -12,
  LOOK_AHEAD_PX: 24,
  LOOK_AHEAD_MS: 400,
  /** Fraction of max run speed that unlocks look-ahead. */
  LOOK_AHEAD_SPEED_FRAC: 0.7,
  /** Fall distance that triggers vertical snap on land. */
  FALL_SNAP_PX: 48,
  FALL_SNAP_MS: 300,
  /** Reserve top HUD band (docs/04 §10.2). */
  VIEWPORT_X: 0,
  VIEWPORT_Y: 20,
  VIEWPORT_W: 320,
  VIEWPORT_H: 148,
  TRAUMA_DECAY_PER_SEC: 1.6,
  TRAUMA_MAX_OFFSET_PX: 4,
  TRAUMA_MAX: 1.0,
} as const;
