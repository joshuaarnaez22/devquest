import { describe, expect, it } from 'vitest';
import { SAMURAI_AIR_ATTACK, SAMURAI_COMBO } from '@entities/player/CharacterCombat';

describe('Samurai Blade Chain data (§7.2.3)', () => {
  it('is a three-hit combo indexed 1-2-3', () => {
    expect(SAMURAI_COMBO).toHaveLength(3);
    expect(SAMURAI_COMBO.map(s => s.index)).toEqual([1, 2, 3]);
  });

  it('hits 1 and 2 are identical light slashes (22 dmg, 66/66/100 ms)', () => {
    for (const i of [0, 1]) {
      const s = SAMURAI_COMBO[i];
      expect(s).toBeDefined();
      if (!s) continue;
      expect(s).toMatchObject({
        windupMs: 66,
        activeMs: 66,
        recoveryMs: 100,
        damage: 22,
        hitKind: 'light',
        knockback: 70,
        arcDegrees: 0,
      });
    }
  });

  it('hit 3 is the heavy 180° finisher (34 dmg, 140 knockback, −60 lift)', () => {
    const s = SAMURAI_COMBO[2];
    expect(s).toBeDefined();
    if (!s) return;
    expect(s).toMatchObject({
      windupMs: 116,
      activeMs: 100,
      recoveryMs: 200,
      damage: 34,
      hitKind: 'heavy',
      knockback: 140,
      knockbackLift: -60,
      arcDegrees: 180,
      offsetX: 0, // centred box for the both-sides arc
    });
  });

  it('the full ground combo lasts 880 ms if landed (§7.2.3)', () => {
    const total = SAMURAI_COMBO.reduce((sum, s) => sum + s.windupMs + s.activeMs + s.recoveryMs, 0);
    expect(total).toBe(880);
  });

  it('total combo damage is 78 (§7.2.3)', () => {
    expect(SAMURAI_COMBO.reduce((sum, s) => sum + s.damage, 0)).toBe(78);
  });

  it('the air attack is a single, non-comboing hit', () => {
    expect(SAMURAI_AIR_ATTACK.comboWindowMs).toBe(0);
    expect(SAMURAI_AIR_ATTACK.index).toBe(1);
  });
});
