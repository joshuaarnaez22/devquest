import { CAMERA } from '@config/CameraConstants';

/** Mutable follow state — owned by CameraSystem, tested without Phaser. */
export interface CameraFollowState {
  scrollX: number;
  scrollY: number;
  lookAheadX: number;
  /** Vertical snap blend 0 = locked at land scroll, 1 = free follow. */
  snapBlend: number;
  snapFromY: number;
  fallAnchorY: number | null;
  wasGrounded: boolean;
}

export interface CameraFollowInput {
  readonly playerX: number;
  readonly playerY: number;
  readonly playerVx: number;
  readonly grounded: boolean;
  readonly facing: -1 | 1;
  readonly maxRunSpeed: number;
  readonly viewW: number;
  readonly viewH: number;
  readonly boundsW: number;
  readonly boundsH: number;
  readonly deltaMs: number;
}

export function createCameraFollowState(scrollX = 0, scrollY = 0): CameraFollowState {
  return {
    scrollX,
    scrollY,
    lookAheadX: 0,
    snapBlend: 1,
    snapFromY: 0,
    fallAnchorY: null,
    wasGrounded: true,
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Ease look-ahead toward ±LOOK_AHEAD_PX when |vx| exceeds 70% max run speed.
 */
export function tickLookAhead(
  current: number,
  opts: {
    readonly playerVx: number;
    readonly facing: -1 | 1;
    readonly maxRunSpeed: number;
    readonly deltaMs: number;
  },
): number {
  const threshold = opts.maxRunSpeed * CAMERA.LOOK_AHEAD_SPEED_FRAC;
  const want =
    Math.abs(opts.playerVx) >= threshold
      ? Math.sign(opts.playerVx || opts.facing) * CAMERA.LOOK_AHEAD_PX
      : 0;
  const t = clamp(opts.deltaMs / CAMERA.LOOK_AHEAD_MS, 0, 1);
  return lerp(current, want, t);
}

/**
 * Deadzone follow: desired scroll keeps the focus point inside the deadzone
 * relative to the camera centre, then lerps at CAMERA.LERP.
 */
export function stepAxis(opts: {
  readonly scroll: number;
  readonly focus: number;
  readonly viewSize: number;
  readonly deadzone: number;
  readonly boundsMax: number;
}): number {
  const halfView = opts.viewSize / 2;
  const halfDead = opts.deadzone / 2;
  const centre = opts.scroll + halfView;
  const lo = centre - halfDead;
  const hi = centre + halfDead;
  let targetCentre = centre;
  if (opts.focus < lo) targetCentre = opts.focus + halfDead;
  else if (opts.focus > hi) targetCentre = opts.focus - halfDead;
  const targetScroll = targetCentre - halfView;
  const next = lerp(opts.scroll, targetScroll, CAMERA.LERP);
  const maxScroll = Math.max(0, opts.boundsMax - opts.viewSize);
  return clamp(next, 0, maxScroll);
}

/**
 * Advance one frame of follow — look-ahead, deadzone lerp, vertical fall snap.
 */
export function tickCameraFollow(state: CameraFollowState, input: CameraFollowInput): void {
  const {
    playerX,
    playerY,
    playerVx,
    grounded,
    facing,
    maxRunSpeed,
    viewW,
    viewH,
    boundsW,
    boundsH,
    deltaMs,
  } = input;

  state.lookAheadX = tickLookAhead(state.lookAheadX, {
    playerVx,
    facing,
    maxRunSpeed,
    deltaMs,
  });

  if (!grounded) {
    if (state.wasGrounded || state.fallAnchorY === null) {
      state.fallAnchorY = playerY;
    } else {
      // Track highest point while airborne (min Y — Phaser Y-down).
      state.fallAnchorY = Math.min(state.fallAnchorY, playerY);
    }
  }

  if (grounded && !state.wasGrounded) {
    const fallDist = state.fallAnchorY === null ? 0 : Math.max(0, playerY - state.fallAnchorY);
    if (fallDist >= CAMERA.FALL_SNAP_PX) {
      state.snapFromY = state.scrollY;
      state.snapBlend = 0;
    }
    state.fallAnchorY = null;
  } else if (state.snapBlend < 1) {
    state.snapBlend = clamp(state.snapBlend + deltaMs / CAMERA.FALL_SNAP_MS, 0, 1);
  }
  state.wasGrounded = grounded;

  const focusX = playerX + state.lookAheadX;
  const focusY = playerY + CAMERA.FOLLOW_OFFSET_Y;

  state.scrollX = stepAxis({
    scroll: state.scrollX,
    focus: focusX,
    viewSize: viewW,
    deadzone: CAMERA.DEADZONE_W,
    boundsMax: boundsW,
  });

  const freeY = stepAxis({
    scroll: state.scrollY,
    focus: focusY,
    viewSize: viewH,
    deadzone: CAMERA.DEADZONE_H,
    boundsMax: boundsH,
  });
  if (state.snapBlend < 1) {
    // Ease from land-frame scroll toward free follow — prevents post-fall whip.
    state.scrollY = lerp(state.snapFromY, freeY, state.snapBlend);
  } else {
    state.scrollY = freeY;
  }
}

/** Quadratic trauma → whole-pixel shake offsets (docs/07 §6.6). */
export function traumaOffset(
  trauma: number,
  sampleX: number,
  sampleY: number,
  maxOffsetPx = CAMERA.TRAUMA_MAX_OFFSET_PX,
): { ox: number; oy: number } {
  if (trauma <= 0) return { ox: 0, oy: 0 };
  const shake = trauma * trauma;
  const ox = Math.round((sampleX * 2 - 1) * shake * maxOffsetPx);
  const oy = Math.round((sampleY * 2 - 1) * shake * maxOffsetPx);
  return { ox, oy };
}
