import { describe, expect, it } from 'vitest';
import { Hurtbox } from '@components/Hurtbox';
import { makeAbilityHarness } from '@entities/player/abilities/abilityTestHarness';
import { SamuraiIai } from '@entities/player/abilities/SamuraiIai';
import type { AbilityTarget } from '@entities/player/abilities/Ability';

function makeTarget(id: number): AbilityTarget {
  return {
    id,
    x: 0,
    y: 0,
    facingDir: 1,
    hurtbox: new Hurtbox({ width: 20, height: 40, offsetX: 0, offsetY: -20 }),
    active: true,
  };
}

describe('SamuraiIai', () => {
  it('releases before the 600ms charge threshold: quick slash, 30 damage', () => {
    const iai = new SamuraiIai();
    const h = makeAbilityHarness();
    h.targets.push(makeTarget(2));
    iai.init(h.ctx);
    h.setTime(0);
    h.setFrame({ specialHeld: true });
    iai.onActivate(h.ctx);

    h.setFrame({ specialHeld: false }); // released well before 600ms
    h.setTime(300, 16);
    iai.update(h.ctx); // charging -> begins the quick slash

    h.setTime(316, 16);
    iai.update(h.ctx); // now slashing -> queues the overlap

    expect(h.hitQueue.size).toBe(1);
    const [hit] = h.hitQueue.drain();
    expect(hit?.step?.damage).toBe(30);
  });

  it('holds past the 600ms charge threshold: charged slash, 55 damage, i-frames granted', () => {
    const iai = new SamuraiIai();
    const h = makeAbilityHarness();
    h.targets.push(makeTarget(2));
    iai.init(h.ctx);
    h.setTime(0);
    h.setFrame({ specialHeld: true });
    iai.onActivate(h.ctx);

    h.setTime(600, 16);
    iai.update(h.ctx); // crosses the threshold, still held -> charge secured, still charging
    expect(h.player.damage.iFrames.isActive(600)).toBe(true);

    h.setFrame({ specialHeld: false });
    h.setTime(650, 16);
    iai.update(h.ctx); // released -> begins the charged slash

    h.setTime(666, 16);
    iai.update(h.ctx); // now slashing -> queues the overlap

    expect(h.hitQueue.size).toBe(1);
    const [hit] = h.hitQueue.drain();
    expect(hit?.step?.damage).toBe(55);
  });

  it('gates canActivate by the 1400ms cooldown, started when the slash begins', () => {
    const iai = new SamuraiIai();
    const h = makeAbilityHarness();
    iai.init(h.ctx);
    h.setTime(0);
    h.setFrame({ specialHeld: true });
    iai.onActivate(h.ctx);
    h.setFrame({ specialHeld: false });
    h.setTime(16, 16);
    iai.update(h.ctx); // starts the slash, cooldownUntil = 16 + 1400

    expect(iai.canActivate(h.ctx)).toBe(false);
    h.setTime(16 + 1400);
    expect(iai.canActivate(h.ctx)).toBe(true);
  });

  it('refunds part of the cooldown on a kill landed by this player while slashing', () => {
    const iai = new SamuraiIai();
    const h = makeAbilityHarness();
    iai.init(h.ctx); // subscribes to combat:kill with h.player.id as the killer

    h.setTime(0);
    h.setFrame({ specialHeld: true });
    iai.onActivate(h.ctx);
    h.setFrame({ specialHeld: false });
    h.setTime(16, 16);
    iai.update(h.ctx); // now slashing, cooldownUntil = 16 + 1400 (quick, killRefundMs = 400)

    h.bus.emit('combat:kill', { victim: 2, killer: h.player.id, enemyId: 'skeleton' });

    h.setTime(16 + 1400 - 400); // 400ms earlier than the un-refunded cooldown
    expect(iai.canActivate(h.ctx)).toBe(true);
  });

  it('does not refund the cooldown for a kill credited to someone else', () => {
    const iai = new SamuraiIai();
    const h = makeAbilityHarness();
    iai.init(h.ctx);

    h.setTime(0);
    h.setFrame({ specialHeld: true });
    iai.onActivate(h.ctx);
    h.setFrame({ specialHeld: false });
    h.setTime(16, 16);
    iai.update(h.ctx);

    h.bus.emit('combat:kill', { victim: 2, killer: 999, enemyId: 'skeleton' });

    h.setTime(16 + 1400 - 400);
    expect(iai.canActivate(h.ctx)).toBe(false); // refund did not apply
  });

  it('refunds the cooldown entirely if interrupted mid-charge by damage', () => {
    const iai = new SamuraiIai();
    const h = makeAbilityHarness();
    iai.init(h.ctx);
    h.setTime(0);
    h.setFrame({ specialHeld: true });
    iai.onActivate(h.ctx); // phase: charging, no cooldown spent yet

    iai.onDeactivate(h.ctx, 'damaged');
    expect(iai.canActivate(h.ctx)).toBe(true);
  });
});
