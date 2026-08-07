/** Jump resolution types — docs/06-Characters.md §5.3. */

export interface JumpContext {
  readonly grounded: boolean;
  readonly coyoteExpiresAt: number;
  readonly airJumpsRemaining: number;
  readonly onWall: boolean;
  /** −1 = wall on left, +1 = wall on right, 0 = none. */
  readonly wallDir: -1 | 0 | 1;
  readonly now: number;
}

export type JumpResult =
  | { readonly kind: 'ground' }
  | { readonly kind: 'coyote' }
  | { readonly kind: 'air'; readonly remaining: number }
  | { readonly kind: 'wall'; readonly pushX: number }
  | { readonly kind: 'none' };
