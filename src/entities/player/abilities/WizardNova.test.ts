import { describe, expect, it } from 'vitest';
import { Hurtbox } from '@components/Hurtbox';
import { makeAbilityHarness } from '@entities/player/abilities/abilityTestHarness';
import { WizardNova } from '@entities/player/abilities/WizardNova';
import type { AbilityTarget } from '@entities/player/abilities/Ability';

function makeTarget(id: number, x: number, y: number): AbilityTarget {
  return {
    id,
    x,
    y,
    facingDir: 1,
    hurtbox: new Hurtbox({ width: 20, height: 40, offsetX: 0, offsetY: -20 }),
    active: true,
  };
}

describe('WizardNova', () => {
  it('releases before the 400ms hold threshold: fires Nova after a 250ms windup', () => {
    const nova = new WizardNova();
    const h = makeAbilityHarness();
    h.targets.push(makeTarget(2, 0, 0));
    nova.init(h.ctx);
    h.setTime(0);
    h.setFrame({ specialHeld: true });
    nova.onActivate(h.ctx);

    h.setFrame({ specialHeld: false }); // released immediately -> undecided resolves to novaWindup
    h.setTime(16, 16);
    expect(nova.update(h.ctx)).toBe('hold'); // windup begins

    h.setTime(250 + 16, 16);
    const result = nova.update(h.ctx); // windup elapsed -> fires
    expect(result).toBe('complete');
    expect(h.hitQueue.size).toBe(1);
    const [hit] = h.hitQueue.drain();
    expect(hit?.step?.damage).toBe(28);
  });

  it('does not hit a target outside the 56px Nova radius', () => {
    const nova = new WizardNova();
    const h = makeAbilityHarness();
    h.targets.push(makeTarget(3, 200, 0));
    nova.init(h.ctx);
    h.setTime(0);
    h.setFrame({ specialHeld: true });
    nova.onActivate(h.ctx);
    h.setFrame({ specialHeld: false });
    h.setTime(16, 16);
    nova.update(h.ctx);
    h.setTime(250 + 16, 16);
    nova.update(h.ctx);

    expect(h.hitQueue.size).toBe(0);
  });

  it('holding past 400ms enters Barrier and spends the cast cost', () => {
    const nova = new WizardNova();
    const h = makeAbilityHarness();
    nova.init(h.ctx);
    h.setTime(0);
    h.setFrame({ specialHeld: true });
    nova.onActivate(h.ctx);

    h.setTime(400, 16);
    const result = nova.update(h.ctx); // crosses HOLD_THRESHOLD_MS while still held -> Barrier
    expect(result).toBe('hold');
    expect(nova.manaValue).toBe(100 - 25); // MANA_MAX - BARRIER_CAST_COST
  });

  it('Barrier absorbs damage fully up to the 40 cap, then breaks', () => {
    const nova = new WizardNova();
    const h = makeAbilityHarness();
    nova.init(h.ctx);
    h.setTime(0);
    h.setFrame({ specialHeld: true });
    nova.onActivate(h.ctx);
    h.setTime(400, 16);
    nova.update(h.ctx); // now in Barrier

    expect(nova.onIncomingDamage(h.ctx, 25)).toBe(0);
    expect(nova.onIncomingDamage(h.ctx, 20)).toBe(0); // 45 total >= 40 cap -> breaks

    // Barrier broken -> phase reset to undecided, no longer absorbing.
    expect(nova.onIncomingDamage(h.ctx, 10)).toBe(10);
  });

  it('regenerates mana at 18/s after a 500ms delay from the last spend', () => {
    const nova = new WizardNova();
    const h = makeAbilityHarness();
    nova.init(h.ctx);
    h.setTime(0);
    h.setFrame({ specialHeld: true });
    nova.onActivate(h.ctx);
    h.setTime(400, 16);
    nova.update(h.ctx); // spends BARRIER_CAST_COST at t=400

    h.setTime(400 + 500, 16); // still within the regen delay window (boundary)
    nova.passiveUpdate(h.ctx);
    const manaAtBoundary = nova.manaValue;

    h.setTime(400 + 500 + 1000, 1000); // 1s later, past the delay -> regen applies
    nova.passiveUpdate(h.ctx);
    expect(nova.manaValue).toBeGreaterThan(manaAtBoundary);
  });

  it('gains mana on a kill credited to this player', () => {
    const nova = new WizardNova();
    const h = makeAbilityHarness();
    nova.init(h.ctx);
    h.setTime(0);
    h.setFrame({ specialHeld: true });
    nova.onActivate(h.ctx);
    h.setTime(400, 16);
    nova.update(h.ctx); // Barrier cast spends 25 -> mana is 75, no longer at the cap
    const before = nova.manaValue;

    h.bus.emit('combat:kill', { victim: 2, killer: h.player.id, enemyId: 'skeleton' });
    expect(nova.manaValue).toBe(before + 15); // MANA_ON_KILL
  });

  it('does not gain mana on a kill credited to someone else', () => {
    const nova = new WizardNova();
    const h = makeAbilityHarness();
    nova.init(h.ctx);
    h.setTime(0);
    h.setFrame({ specialHeld: true });
    nova.onActivate(h.ctx);
    h.setTime(400, 16);
    nova.update(h.ctx);
    const before = nova.manaValue;

    h.bus.emit('combat:kill', { victim: 2, killer: 999, enemyId: 'skeleton' });
    expect(nova.manaValue).toBe(before);
  });

  it('readiness is 1 once mana covers the Nova cost and no cooldown is active', () => {
    const nova = new WizardNova();
    const h = makeAbilityHarness();
    nova.init(h.ctx);
    h.setTime(0);
    expect(nova.readiness(h.ctx)).toBe(1);
  });
});
