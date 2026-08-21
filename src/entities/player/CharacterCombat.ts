import type { AttackStep } from '@entities/player/AttackStep';

/**
 * Samurai three-hit Blade Chain — docs/06-Characters.md §7.2.3. Timings, damage, hit tier,
 * and knockback are normative from that table (hits 1/2 = light 22 dmg, hit 3 = heavy 34).
 *
 * NOT in the table (chosen, flag if tuned): `rangeY`/`offsetY` — the table gives only the
 * horizontal range, so heights follow the 28px body and the enemy hitbox shape in docs/08
 * (`h ≈ body height`). Hit 3's 180° arc is a box centred on the player (`offsetX 0`).
 */
export const SAMURAI_COMBO: readonly AttackStep[] = [
  {
    index: 1,
    windupMs: 66,
    activeMs: 66,
    recoveryMs: 100,
    damage: 22,
    rangeX: 30,
    rangeY: 24,
    offsetX: 18,
    offsetY: 0,
    hitKind: 'light',
    knockback: 70,
    knockbackLift: 0,
    arcDegrees: 0,
    comboWindowMs: 300,
  },
  {
    index: 2,
    windupMs: 66,
    activeMs: 66,
    recoveryMs: 100,
    damage: 22,
    rangeX: 30,
    rangeY: 24,
    offsetX: 18,
    offsetY: 0,
    hitKind: 'light',
    knockback: 70,
    knockbackLift: 0,
    arcDegrees: 0,
    comboWindowMs: 300,
  },
  {
    index: 3,
    windupMs: 116,
    activeMs: 100,
    recoveryMs: 200,
    damage: 34,
    rangeX: 34,
    rangeY: 28,
    offsetX: 0,
    offsetY: 0,
    hitKind: 'heavy',
    knockback: 140,
    knockbackLift: -60,
    arcDegrees: 180,
    comboWindowMs: 300,
  },
];

/**
 * Air attack. The §7.2.5 animation (`air_attack`, 5 frames @16 fps ≈ 312 ms) is specified,
 * but no AttackStep numbers are; DERIVED here as windup 2 / active 1 / recovery 2 frames at
 * ~62.5 ms/frame, baseDamage (22), light tier, single hit (no air combo). Flag if tuned.
 */
export const SAMURAI_AIR_ATTACK: AttackStep = {
  index: 1,
  windupMs: 125,
  activeMs: 63,
  recoveryMs: 125,
  damage: 22,
  rangeX: 28,
  rangeY: 26,
  offsetX: 12,
  offsetY: 6,
  hitKind: 'light',
  knockback: 70,
  knockbackLift: 0,
  arcDegrees: 0,
  comboWindowMs: 0,
};
