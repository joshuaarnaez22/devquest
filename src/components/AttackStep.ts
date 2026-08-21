import type { BoxSpec } from '@components/Box';
import type { HitKind } from '@config/CombatFeedback';

/**
 * One step of an attack, time-scheduled in milliseconds — never driven by animation frames
 * (docs/06-Characters.md §9, §11.2). An artist may retime the art without shifting combat
 * balance. `animKey` joins this when animation (M3) lands; `vfxId` itself is NOT stored here
 * — it comes from `HIT_TIERS[hitKind]` at resolution time (M2-T5), since it is a property of
 * the tier, not the individual step.
 *
 * Lives in `components/` (not `entities/player/`, where it originated) because `systems`
 * (`HitQueue`/`CombatSystem`) needs to reference it for `QueuedHit.step`, and `systems` and
 * `entities` are sibling layers that cannot import each other — `components` is the shared
 * layer both are allowed to import (docs/03-Technical-Architecture.md §6.1).
 */
export interface AttackStep {
  readonly index: 1 | 2 | 3;
  readonly windupMs: number;
  readonly activeMs: number;
  readonly recoveryMs: number;
  readonly damage: number;
  readonly rangeX: number; // hitbox width
  readonly rangeY: number; // hitbox height
  readonly offsetX: number; // from pivot; forward-positive (scaled by facing)
  readonly offsetY: number;
  readonly hitKind: HitKind;
  readonly knockback: number;
  readonly knockbackLift: number;
  readonly arcDegrees: number; // 0 = forward only, 180 = both sides (box centred on the pivot)
  readonly comboWindowMs: number;
  /** Slash VFX rotation (§6.5) — 0 flipped by facing for a horizontal slash. */
  readonly vfxAngleDeg: number;
}

/** Hitbox geometry for a step. Generosity (§5.2) is applied at art-authoring time (M3). */
export function hitboxSpecFor(step: AttackStep): BoxSpec {
  return { width: step.rangeX, height: step.rangeY, offsetX: step.offsetX, offsetY: step.offsetY };
}
