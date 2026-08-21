/**
 * Skeleton FSM state ids — docs/08-Enemy-System.md §5.1, scoped to what the Basic-
 * tier Skeleton (M2-T9) actually needs. `SPAWN` (needs a spawn animation, M3),
 * `REPOSITION`/`SPECIAL` (ranged/special-only), and `SEARCH` (lost-player re-
 * acquisition) are the shared framework's — the hardcoded Skeleton starts directly
 * in `IDLE` and falls back to `IDLE` on losing the player rather than searching.
 * All nine states here ARE the full shared-framework set otherwise; M4's extraction
 * adds the omitted four back for enemies that need them.
 */
export type SkeletonStateId =
  'IDLE' | 'PATROL' | 'ALERT' | 'CHASE' | 'WINDUP' | 'ATTACK' | 'RECOVER' | 'HURT' | 'DEATH';
