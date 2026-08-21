import { describe, expect, it } from 'vitest';
import { HIT_TIERS, PARTICLE_FOR_HIT_KIND, type HitKind } from '@config/CombatFeedback';

const KINDS: readonly HitKind[] = ['light', 'heavy', 'magic', 'ranged', 'contact', 'hazard'];

describe('HIT_TIERS (§12, NORMATIVE)', () => {
  it('has exactly one entry per HitKind, no more, no less', () => {
    expect(Object.keys(HIT_TIERS).sort()).toEqual([...KINDS].sort());
  });

  it('matches the documented values exactly (regression against §12)', () => {
    expect(HIT_TIERS.light).toEqual({
      hitStopMs: 60,
      flashMs: 80,
      knockbackSpeed: 70,
      knockbackLift: 0,
      knockbackDecayMs: 200,
      trauma: 0.14,
      vfxId: 'slash_light',
      particleCount: 6,
    });
    expect(HIT_TIERS.heavy).toEqual({
      hitStopMs: 110,
      flashMs: 80,
      knockbackSpeed: 140,
      knockbackLift: -60,
      knockbackDecayMs: 260,
      trauma: 0.26,
      vfxId: 'slash_heavy',
      particleCount: 10,
    });
    expect(HIT_TIERS.hazard).toEqual({
      hitStopMs: 0,
      flashMs: 80,
      knockbackSpeed: 120,
      knockbackLift: -80,
      knockbackDecayMs: 250,
      trauma: 0.3,
      vfxId: 'impact_spike',
      particleCount: 8,
    });
  });

  it('hazard hits produce zero hit stop (spikes/pits, §6.2)', () => {
    expect(HIT_TIERS.hazard.hitStopMs).toBe(0);
  });

  it('every flashMs is 80 (uniform per §6.3)', () => {
    for (const k of KINDS) expect(HIT_TIERS[k].flashMs).toBe(80);
  });
});

describe('PARTICLE_FOR_HIT_KIND (§6.9)', () => {
  it('covers every hit kind', () => {
    expect(Object.keys(PARTICLE_FOR_HIT_KIND).sort()).toEqual([...KINDS].sort());
  });

  it('matches the documented defaults', () => {
    expect(PARTICLE_FOR_HIT_KIND).toEqual({
      light: 'spark',
      heavy: 'spark',
      magic: 'arcane_mote',
      ranged: 'spark',
      contact: 'dust',
      hazard: 'spark',
    });
  });
});
