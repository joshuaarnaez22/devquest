import type { AttackStep } from '@components/AttackStep';

/**
 * Samurai three-hit Blade Chain — docs/06-Characters.md §7.2.3. Timings, damage, hit tier,
 * and knockback are normative from that table (hits 1/2 = light 22 dmg, hit 3 = heavy 34).
 *
 * NOT in the table (chosen, flag if tuned): `rangeY`/`offsetY` — the table gives only the
 * horizontal range, so heights follow the 28px body and the enemy hitbox shape in docs/08
 * (`h ≈ body height`). Hit 3's 180° arc is a box centred on the player (`offsetX 0`).
 *
 * `vfxAngleDeg` (§6.5): hit 1 "Rising slash" and hit 3 "Spinning finisher" match the angle
 * table exactly (+45°, and 0° base — the finisher's continuous 360° rotation is a VfxSystem
 * animation behaviour, not a static angle, deferred to M2-T7). Hit 2 "Reverse slash" has no
 * table entry; defaulted to 0° (closest to "Horizontal slash"), flag if tuned.
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
    vfxAngleDeg: 45,
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
    vfxAngleDeg: 0, // inferred — not in the §6.5 angle table
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
    vfxAngleDeg: 0, // base angle; continuous rotation is a VfxSystem behaviour (M2-T7)
  },
];

/**
 * Air attack. The §7.2.5 animation (`air_attack`, 5 frames @16 fps ≈ 312 ms) is specified,
 * but no AttackStep numbers are; DERIVED here as windup 2 / active 1 / recovery 2 frames at
 * ~62.5 ms/frame, baseDamage (22), light tier, single hit (no air combo). Flag if tuned.
 * `vfxAngleDeg: 75` matches §6.5's "Air attack (downward)" row exactly.
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
  vfxAngleDeg: 75,
};
