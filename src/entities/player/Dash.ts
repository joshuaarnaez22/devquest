/** Dash resolution types — docs/06-Characters.md §5.5. */

export interface DashContext {
  readonly now: number;
  /** Facing when moveX is 0 — horizontal only. */
  readonly facing: -1 | 1;
  readonly grounded: boolean;
  /** One air dash per airborne period; ignored when grounded. */
  readonly airDashAvailable: boolean;
}

export type DashResult =
  | { readonly kind: 'started'; readonly dirX: -1 | 1 }
  | { readonly kind: 'onCooldown'; readonly remainingMs: number }
  | { readonly kind: 'blocked' };
