import { describe, expect, it } from 'vitest';
import { asAbility, makeAbilityHarness } from '@entities/player/abilities/abilityTestHarness';
import { NinjaShadow } from '@entities/player/abilities/NinjaShadow';

describe('NinjaShadow', () => {
  it('teleports the full 64px when nothing blocks the path', () => {
    const ninja = new NinjaShadow();
    const h = makeAbilityHarness({ x: 0, facingDir: 1 });
    asAbility(ninja).init(h.ctx);
    h.setSolid(() => false);
    h.setTime(0);
    const result = ninja.onActivate(h.ctx);

    expect(result).toBe('complete');
    expect(h.player.body.x).toBeCloseTo(64 - h.player.body.halfWidth);
  });

  it('samples back toward the origin and stops short of a wall', () => {
    const ninja = new NinjaShadow();
    const h = makeAbilityHarness({ x: 0, facingDir: 1 });
    asAbility(ninja).init(h.ctx);
    // Solid from 40px onward — the 8/8..6/8 samples (64, 56, 48) are blocked,
    // the 5/8 sample (40px) is the first clear one walking back.
    h.setSolid(x => x >= 48);
    h.setTime(0);
    ninja.onActivate(h.ctx);

    expect(h.player.body.x).toBeCloseTo(40 - h.player.body.halfWidth);
  });

  it('cancels in place when every sample is blocked', () => {
    const ninja = new NinjaShadow();
    const h = makeAbilityHarness({ x: 10, facingDir: 1 });
    asAbility(ninja).init(h.ctx);
    h.setSolid(() => true);
    h.setTime(0);
    ninja.onActivate(h.ctx);

    expect(h.player.body.x).toBeCloseTo(10 - h.player.body.halfWidth);
  });

  it('teleports left when facing left', () => {
    const ninja = new NinjaShadow();
    const h = makeAbilityHarness({ x: 100, facingDir: -1 });
    asAbility(ninja).init(h.ctx);
    h.setSolid(() => false);
    h.setTime(0);
    ninja.onActivate(h.ctx);

    expect(h.player.body.x).toBeCloseTo(100 - 64 - h.player.body.halfWidth);
  });

  it('grants i-frames and restores air mobility on activation', () => {
    const ninja = new NinjaShadow();
    const h = makeAbilityHarness();
    asAbility(ninja).init(h.ctx);
    h.setSolid(() => false);
    h.setTime(1000);
    ninja.onActivate(h.ctx);

    expect(h.player.damage.iFrames.isActive(1000)).toBe(true);
    expect(h.player.restoreAirMobilityCalls).toBe(1);
  });

  it('leaves a decoy at the origin that expires after its lifetime', () => {
    const ninja = new NinjaShadow();
    const h = makeAbilityHarness({ x: 5, y: 7 });
    asAbility(ninja).init(h.ctx);
    h.setSolid(() => false);
    h.setTime(0);
    ninja.onActivate(h.ctx);

    expect(ninja.activeDecoy).toEqual({ x: 5, y: 7, expiresAt: 1200 });

    h.setTime(1199);
    ninja.passiveUpdate(h.ctx);
    expect(ninja.activeDecoy).not.toBeNull();

    h.setTime(1200);
    ninja.passiveUpdate(h.ctx);
    expect(ninja.activeDecoy).toBeNull();
  });

  it('gates canActivate by the 3000ms cooldown', () => {
    const ninja = new NinjaShadow();
    const h = makeAbilityHarness();
    asAbility(ninja).init(h.ctx);
    h.setSolid(() => false);
    h.setTime(0);
    ninja.onActivate(h.ctx);

    expect(ninja.canActivate(h.ctx)).toBe(false);
    h.setTime(2999);
    expect(ninja.canActivate(h.ctx)).toBe(false);
    h.setTime(3000);
    expect(ninja.canActivate(h.ctx)).toBe(true);
  });
});
