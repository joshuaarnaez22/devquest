import { describe, expect, it } from 'vitest';
import { asAbility, makeAbilityHarness } from '@entities/player/abilities/abilityTestHarness';
import { KnightGuard } from '@entities/player/abilities/KnightGuard';

describe('KnightGuard', () => {
  it('takes full damage from behind even while guarding', () => {
    const guard = new KnightGuard();
    const h = makeAbilityHarness();
    asAbility(guard).init(h.ctx);
    h.setFrame({ specialHeld: true });
    h.setTime(0);
    guard.onActivate(h.ctx);

    h.setTime(500); // past the parry window
    const dmg = guard.onIncomingDamage(h.ctx, 20, 2, true);
    expect(dmg).toBe(20);
    expect(h.player.knockbackResist).toBe(0);
  });

  it('reduces damage 75% and knockback 90% for a blocked hit from the front', () => {
    const guard = new KnightGuard();
    const h = makeAbilityHarness();
    asAbility(guard).init(h.ctx);
    h.setFrame({ specialHeld: true });
    h.setTime(0);
    guard.onActivate(h.ctx);

    h.setTime(500); // past the 200ms parry window
    const dmg = guard.onIncomingDamage(h.ctx, 20, 2, false);
    expect(dmg).toBeCloseTo(5); // 20 * (1 - 0.75)
    expect(h.player.knockbackResist).toBeCloseTo(0.9);
  });

  it('parries a front hit within the 200ms window: zero damage, guaranteed crit', () => {
    const guard = new KnightGuard();
    const h = makeAbilityHarness();
    asAbility(guard).init(h.ctx);
    h.setFrame({ specialHeld: true });
    h.setTime(1000);
    guard.onActivate(h.ctx);

    h.setTime(1100); // 100ms in, within the 200ms parry window
    const dmg = guard.onIncomingDamage(h.ctx, 20, 2, false);
    expect(dmg).toBe(0);
    expect(guard.lastParried).toBe(2);

    let parried = false;
    h.bus.on('ability:parried', () => {
      parried = true;
    });
    // passiveUpdate consumes the pending critical onto the player's next attack.
    guard.passiveUpdate(h.ctx);
    expect(h.player.abilitySlot.markedCritical).toBe(true);
    void parried;
  });

  it('emits ability:parried with the attacker and victim on a parry', () => {
    const guard = new KnightGuard();
    const h = makeAbilityHarness();
    asAbility(guard).init(h.ctx);
    h.setFrame({ specialHeld: true });
    h.setTime(0);
    guard.onActivate(h.ctx);

    let payload: { attacker: number; victim: number } | null = null;
    h.bus.on('ability:parried', p => {
      payload = { attacker: p.attacker, victim: p.victim };
    });
    h.setTime(50);
    guard.onIncomingDamage(h.ctx, 20, 2, false);
    expect(payload).toEqual({ attacker: 2, victim: h.player.id });
  });

  it('resets knockbackResist to 0 every call so a reduction never leaks to the next hit', () => {
    const guard = new KnightGuard();
    const h = makeAbilityHarness();
    asAbility(guard).init(h.ctx);
    h.setFrame({ specialHeld: true });
    h.setTime(0);
    guard.onActivate(h.ctx);

    h.setTime(500);
    guard.onIncomingDamage(h.ctx, 20, 2, false); // blocked -> resist elevated
    expect(h.player.knockbackResist).toBeCloseTo(0.9);

    guard.onIncomingDamage(h.ctx, 20, 2, true); // from behind on the next hit
    expect(h.player.knockbackResist).toBe(0);
  });

  it('breaks guard after 3 blocked hits within the 2s window, gating canActivate', () => {
    const guard = new KnightGuard();
    const h = makeAbilityHarness();
    asAbility(guard).init(h.ctx);
    h.setFrame({ specialHeld: true });
    h.setTime(0);
    guard.onActivate(h.ctx);

    h.setTime(1000);
    guard.onIncomingDamage(h.ctx, 10, 2, false);
    h.setTime(1200);
    guard.onIncomingDamage(h.ctx, 10, 2, false);
    expect(guard.canActivate(h.ctx)).toBe(true);

    h.setTime(1400);
    guard.onIncomingDamage(h.ctx, 10, 2, false); // 3rd blocked hit -> guard breaks
    expect(guard.canActivate(h.ctx)).toBe(false);

    h.setTime(1400 + 500); // GUARD_BREAK_STUN_MS elapsed
    expect(guard.canActivate(h.ctx)).toBe(true);
  });

  it('does not activate while special is not held', () => {
    const guard = new KnightGuard();
    const h = makeAbilityHarness();
    asAbility(guard).init(h.ctx);
    h.setFrame({ specialHeld: false });
    expect(guard.canActivate(h.ctx)).toBe(false);
  });
});
