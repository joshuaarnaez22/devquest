import { describe, expect, it } from 'vitest';
import { Knockback } from '@components/Knockback';
import { KnockbackSystem, type KnockbackBody } from '@systems/KnockbackSystem';

function makeBody(vx = 0, vy = 0): KnockbackBody {
  return { velocity: { x: vx, y: vy } };
}

describe('KnockbackSystem (§6.4)', () => {
  it('apply with no registered entity is a harmless no-op', () => {
    const ks = new KnockbackSystem();
    expect(() => ks.apply(1, { speed: 70, dirX: 1, liftY: 0, decayMs: 200 })).not.toThrow();
  });

  it('starts the registered Knockback component on apply', () => {
    const ks = new KnockbackSystem();
    const kb = new Knockback();
    const body = makeBody();
    ks.register(1, kb, body);

    ks.apply(1, { speed: 70, dirX: 1, liftY: 0, decayMs: 200 });
    expect(kb.active).toBe(true);
  });

  it('ADDS to existing velocity rather than overriding it (§6.4)', () => {
    const ks = new KnockbackSystem();
    const kb = new Knockback();
    const body = makeBody(30, 0); // victim already moving under their own input
    ks.register(1, kb, body);

    ks.apply(1, { speed: 70, dirX: 1, liftY: 0, decayMs: 200 });
    ks.postPhysics(0, 16.67);

    expect(body.velocity.x).toBeGreaterThan(30); // 30 (own) + a positive knockback delta
  });

  it('applies vertical lift once, instantaneously', () => {
    const ks = new KnockbackSystem();
    const kb = new Knockback();
    const body = makeBody(0, 50); // e.g. already falling
    ks.register(1, kb, body);

    ks.apply(1, { speed: 140, dirX: 1, liftY: -60, decayMs: 260 });
    ks.postPhysics(0, 16.67);
    expect(body.velocity.y).toBe(-60); // overwritten by the pop, not added to the fall speed

    const yAfterFirstTick = body.velocity.y;
    ks.postPhysics(16.67, 16.67);
    expect(body.velocity.y).toBe(yAfterFirstTick); // one-shot — not reapplied every frame
  });

  it('decays to inactive and stops touching velocity once expired', () => {
    const ks = new KnockbackSystem();
    const kb = new Knockback();
    const body = makeBody();
    ks.register(1, kb, body);

    ks.apply(1, { speed: 70, dirX: 1, liftY: 0, decayMs: 50 });
    ks.postPhysics(0, 50); // consumes the whole window
    expect(kb.active).toBe(false);

    const vxAfterDecay = body.velocity.x;
    ks.postPhysics(50, 16.67);
    expect(body.velocity.x).toBe(vxAfterDecay); // untouched — inactive is skipped, not zeroed
  });

  it('a same-frame second hit replaces the impulse rather than summing (§9.3)', () => {
    const ks = new KnockbackSystem();
    const kb = new Knockback();
    const body = makeBody();
    ks.register(1, kb, body);

    ks.apply(1, { speed: 140, dirX: 1, liftY: -60, decayMs: 260 });
    ks.apply(1, { speed: 70, dirX: -1, liftY: 0, decayMs: 200 }); // CombatSystem already
    // resolves priority order — this proves KnockbackSystem itself does not sum either.
    ks.postPhysics(0, 16.67);

    expect(body.velocity.x).toBeLessThan(0); // pushed left, per the second (winning) hit
    expect(kb.takeLift()).toBe(0); // the replacement had no lift, and it already consumed
  });

  it('unregister stops future application', () => {
    const ks = new KnockbackSystem();
    const kb = new Knockback();
    const body = makeBody();
    ks.register(1, kb, body);
    ks.unregister(1);

    ks.apply(1, { speed: 70, dirX: 1, liftY: 0, decayMs: 200 });
    expect(kb.active).toBe(false);
  });
});
