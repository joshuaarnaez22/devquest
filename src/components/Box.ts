/**
 * Shared AABB geometry for hitboxes and hurtboxes (docs/07-Combat.md §5.1–§5.3).
 * Axis-aligned rectangles only — no circles, polygons, or rotation.
 */

/** A box relative to its owner, centered at (ownerX + offsetX·facing, ownerY + offsetY). */
export interface BoxSpec {
  readonly width: number;
  readonly height: number;
  readonly offsetX: number; // from owner pivot; + = forward (scaled by facing)
  readonly offsetY: number; // + = down
}

/** World-space axis-aligned box, top-left origin. */
export interface Aabb {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Resolve a spec to a world AABB for a given owner position and facing. */
export function boxRect(spec: BoxSpec, ownerX: number, ownerY: number, facing: -1 | 1): Aabb {
  return {
    x: ownerX + spec.offsetX * facing - spec.width / 2,
    y: ownerY + spec.offsetY - spec.height / 2,
    width: spec.width,
    height: spec.height,
  };
}

/** Standard AABB overlap. Touching edges do not count as an overlap. */
export function aabbOverlap(a: Aabb, b: Aabb): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/**
 * Per-edge expansion in the box's LOCAL frame (before facing is applied), in px.
 * Positive grows the box outward on that edge; negative shrinks it. `forward` is
 * the +offsetX (facing) side; `back` the opposite.
 */
export interface EdgeDelta {
  readonly forward: number;
  readonly back: number;
  readonly top: number;
  readonly bottom: number;
}

/** Apply per-edge deltas, recomputing size and re-centering the offset. */
export function expand(spec: BoxSpec, d: EdgeDelta): BoxSpec {
  return {
    width: spec.width + d.forward + d.back,
    height: spec.height + d.top + d.bottom,
    offsetX: spec.offsetX + (d.forward - d.back) / 2,
    offsetY: spec.offsetY + (d.bottom - d.top) / 2,
  };
}

/**
 * The generosity asymmetry (§5.2), as edge deltas applied to a sprite's VISUAL box:
 * the player's attacks reach further than they look, the player is smaller than they
 * look, and enemies are larger. Invisible, and it is what makes combat feel fair.
 *
 * The table gives directions and magnitudes; the mapping to a centered box is:
 *   - "leading edge" = the `forward` edge (the way the entity faces).
 *   - "each side" = both `forward` and `back`.
 *   - "+2 px vertically" (player hitbox) is read as +1 `top` / +1 `bottom`.
 */
export const GENEROSITY = {
  PLAYER_HITBOX: { forward: 3, back: 0, top: 1, bottom: 1 },
  PLAYER_HURTBOX: { forward: -2, back: -2, top: -3, bottom: 0 },
  ENEMY_HURTBOX: { forward: 2, back: 2, top: 1, bottom: 0 },
  HAZARD_HITBOX: { forward: -2, back: -2, top: 0, bottom: 0 },
} as const satisfies Record<string, EdgeDelta>;
