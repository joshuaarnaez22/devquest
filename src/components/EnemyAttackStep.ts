import type { BoxSpec } from '@components/Box';
import type { HitKind } from '@config/CombatFeedback';

/**
 * NORMATIVE — docs/08-Enemy-System.md §12 (`enemy.schema.ts`). One attack an enemy
 * can select and run. Distinct shape from the player's `AttackStep` (§9-`characters.
 * schema.ts`): no `knockback`/`knockbackLift`/`vfxAngleDeg` — those come from
 * `HIT_TIERS[hitKind]` only for enemy attacks (no per-step override exists in the
 * schema). `weight`/`minRange`/`maxRange`/`telegraph` support multi-attack selection
 * (M4+); the Basic Skeleton (M2-T9) has exactly one attack, so they are present but
 * inert for now.
 *
 * `ProjectileId` is referenced in the docs but never enumerated anywhere (no ranged
 * enemy or ability exists yet to need it) — typed `string` as a placeholder, same
 * treatment as `KNOCKBACK_IMPULSE_SCALE` (M2-T7).
 */
export interface EnemyAttackStep {
  readonly id: string;
  readonly displayName: string;
  readonly windupMs: number; // >= 250
  readonly activeMs: number;
  readonly recoverMs: number;
  readonly damage: number;
  readonly hitKind: HitKind;
  readonly hitbox: {
    readonly w: number;
    readonly h: number;
    readonly ox: number;
    readonly oy: number;
  };
  readonly arcDegrees: number;
  readonly unblockable: boolean;
  readonly minRange: number;
  readonly maxRange: number;
  readonly cooldownMs: number;
  readonly weight: number;
  readonly telegraph: {
    readonly animKey: string;
    readonly flashOnFrame: number; // -1 = no flash
    readonly audioId: string | null;
    readonly selfIlluminate: boolean;
  };
  readonly projectileId?: string;
}

/** Hitbox geometry for an enemy attack step — mirrors `hitboxSpecFor` for `AttackStep`. */
export function enemyHitboxSpecFor(step: EnemyAttackStep): BoxSpec {
  return {
    width: step.hitbox.w,
    height: step.hitbox.h,
    offsetX: step.hitbox.ox,
    offsetY: step.hitbox.oy,
  };
}
