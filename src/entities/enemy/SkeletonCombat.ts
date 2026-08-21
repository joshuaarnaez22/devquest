import type { EnemyAttackStep } from '@components/EnemyAttackStep';

/**
 * Skeleton Basic — docs/08-Enemy-System.md §6.1. Hardcoded per ADR-004 (M2-T9):
 * this is ONE enemy's numbers inline, not the JSON `EnemyDefinition` framework
 * (§9) — that extraction is M4's job once a second enemy exists to generalise from.
 */
export const SKELETON_STATS = {
  maxHp: 30,
  contactDamage: 6,
  moveSpeed: 34,
  chaseSpeed: 52,
  poise: 12,
  poiseRegenDelayMs: 1500,
  staggerMs: 220, // §8.2 "Full Stagger" — the HURT state duration
  armour: 0,
} as const;

/**
 * Not specified for the Skeleton by §6.1 or §5.2 (only the 300–600 ms band and
 * "not per-enemy" framework ranges exist) — chosen within range, flag if tuned.
 */
export const SKELETON_TIMINGS = {
  idleDurationMs: 1000,
  alertDurationMs: 400,
} as const;

/** §6.1.4. */
export const SKELETON_SENSE = {
  sightRange: 96,
  sightAngleDeg: 120,
  hearRange: 48,
  loseSightMs: 2500,
  requiresLineOfSight: true,
} as const;

/**
 * §6.1.3 Overhead swing. `hitbox.h`/`ox` are not given by the single "Range 26 px"
 * column — chosen to match the AttackStep precedent (square-ish box, forward offset
 * so it reaches past the Skeleton's own body), flag if tuned.
 */
export const SKELETON_OVERHEAD_SWING: EnemyAttackStep = {
  id: 'overhead_swing',
  displayName: 'Overhead swing',
  windupMs: 600,
  activeMs: 133,
  recoverMs: 500,
  damage: 10,
  hitKind: 'light',
  hitbox: { w: 26, h: 26, ox: 10, oy: 0 },
  arcDegrees: 0,
  unblockable: false,
  minRange: 0,
  maxRange: 26,
  cooldownMs: 900,
  weight: 1,
  telegraph: { animKey: 'windup_overhead', flashOnFrame: 2, audioId: null, selfIlluminate: false },
};

export const SKELETON_ATTACKS: readonly EnemyAttackStep[] = [SKELETON_OVERHEAD_SWING];
