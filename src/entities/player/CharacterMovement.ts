/** Movement block from CharacterDefinition — docs/06-Characters.md §9. */

export interface CharacterMovement {
  readonly runSpeed: number;
  readonly groundAccel: number;
  readonly groundDecel: number;
  readonly airAccel: number;
  readonly airDecel: number;
  readonly jumpVelocity: number;
  readonly airJumps: number;
  readonly airJumpScale: number;
  readonly dashSpeed: number;
  readonly dashDurationMs: number;
  readonly dashCooldownMs: number;
  readonly dashIFrames: boolean;
  readonly dashIFrameGraceMs: number;
  readonly wallSlideSpeed: number;
}

/** Samurai baseline from docs/06 §5.2 — mirrors `public/assets/data/characters/samurai.json`. */
export const SAMURAI_MOVEMENT: CharacterMovement = {
  runSpeed: 90,
  groundAccel: 900,
  groundDecel: 1200,
  airAccel: 600,
  airDecel: 400,
  jumpVelocity: -240,
  airJumps: 0,
  airJumpScale: 0.88,
  dashSpeed: 260,
  dashDurationMs: 150,
  dashCooldownMs: 500,
  dashIFrames: false,
  dashIFrameGraceMs: 0,
  wallSlideSpeed: 70,
};
