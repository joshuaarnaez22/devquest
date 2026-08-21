import type { BoxSpec } from '@components/Box';

/**
 * Feedback tier — drives hit-stop / shake / knockback magnitude (docs/07-Combat.md §12,
 * HIT_TIERS). This is the combat "kind"; the M0 stub `HitKind` in `core/GameEvents` is a
 * different, older shape (hit source) and gets reconciled when CombatSystem lands (M2-T5).
 */
export type HitKind = 'light' | 'heavy' | 'magic' | 'ranged' | 'contact' | 'hazard';

/**
 * One step of an attack, time-scheduled in milliseconds — never driven by animation frames
 * (docs/06-Characters.md §9, §11.2). An artist may retime the art without shifting combat
 * balance. `animKey`/`vfxId` join this when animation (M3) and the VFX layer (M2-T7) land;
 * only timing, geometry, and resolution inputs are needed to schedule a hit.
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
}

/** Hitbox geometry for a step. Generosity (§5.2) is applied at art-authoring time (M3). */
export function hitboxSpecFor(step: AttackStep): BoxSpec {
  return { width: step.rangeX, height: step.rangeY, offsetX: step.offsetX, offsetY: step.offsetY };
}
