import { describe, expect, it } from 'vitest';
import {
  DAMAGE_NUMBER_COLOUR,
  HIT_TIERS,
  PARTICLE_FOR_HIT_KIND,
  VFX_VISUAL,
  type DamageNumberStyle,
  type HitKind,
  type VfxId,
} from '@config/CombatFeedback';

const KINDS: readonly HitKind[] = ['light', 'heavy', 'magic', 'ranged', 'contact', 'hazard'];
const VFX_IDS: readonly VfxId[] = [
  'slash_light',
  'slash_heavy',
  'slash_magic',
  'impact_small',
  'impact_spike',
  'explosion_small',
  'explosion_large',
];
const NUMBER_STYLES: readonly DamageNumberStyle[] = [
  'normal',
  'critical',
  'magic',
  'playerDamage',
  'heal',
  'blocked',
];

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

describe('VFX_VISUAL (§6.5, §6.10)', () => {
  it('has exactly one entry per VfxId, no more, no less', () => {
    expect(Object.keys(VFX_VISUAL).sort()).toEqual([...VFX_IDS].sort());
  });

  it('matches §6.5 sizes and frame counts exactly', () => {
    expect(VFX_VISUAL.slash_light).toEqual({ width: 32, height: 32, frames: 5 });
    expect(VFX_VISUAL.slash_heavy).toEqual({ width: 48, height: 48, frames: 7 });
    expect(VFX_VISUAL.slash_magic).toEqual({ width: 40, height: 40, frames: 6 });
    expect(VFX_VISUAL.impact_small).toEqual({ width: 16, height: 16, frames: 4 });
    expect(VFX_VISUAL.impact_spike).toEqual({ width: 24, height: 24, frames: 5 });
  });

  it('matches §6.10 death explosion sizes', () => {
    expect(VFX_VISUAL.explosion_small).toEqual({ width: 32, height: 32, frames: 8 });
    expect(VFX_VISUAL.explosion_large).toEqual({ width: 64, height: 64, frames: 12 });
  });

  it('every HIT_TIERS vfxId resolves to a real VFX_VISUAL entry', () => {
    for (const k of KINDS) {
      expect(VFX_VISUAL[HIT_TIERS[k].vfxId]).toBeDefined();
    }
  });

  it("slash_light's 5 frames @ 60fps matches §6.5's documented 83ms duration", () => {
    const ms = (VFX_VISUAL.slash_light.frames / 60) * 1000;
    expect(ms).toBeCloseTo(83, 0);
  });
});

describe('DAMAGE_NUMBER_COLOUR (§6.8)', () => {
  it('has exactly one entry per DamageNumberStyle, no more, no less', () => {
    expect(Object.keys(DAMAGE_NUMBER_COLOUR).sort()).toEqual([...NUMBER_STYLES].sort());
  });

  it('matches the documented hex values exactly', () => {
    expect(DAMAGE_NUMBER_COLOUR).toEqual({
      normal: 0xf2f0f5,
      critical: 0xffd23f,
      magic: 0xbd6fd1,
      playerDamage: 0xf04a4a,
      heal: 0x2fbf6b,
      blocked: 0x9a97a6,
    });
  });
});
