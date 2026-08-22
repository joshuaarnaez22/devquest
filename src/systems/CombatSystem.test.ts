import { describe, expect, it } from 'vitest';
import { Health } from '@components/Health';
import { Hitbox } from '@components/Hitbox';
import { IFrames } from '@components/IFrames';
import { Poise } from '@components/Poise';
import {
  buildResolution,
  compareHitPriority,
  computeDamage,
  CombatSystem,
  type CombatSinks,
  type CombatVictim,
  type HitResolution,
} from '@systems/CombatSystem';
import { HitQueue, type QueuedHit } from '@systems/HitQueue';
import type { AttackStep } from '@components/AttackStep';
import type { EnemyAttackStep } from '@components/EnemyAttackStep';
import type { EntityId } from '@core/GameEvents';

// docs/06-Characters.md §7.2.3 hit 1 — Rising slash.
const SAMURAI_HIT_1: AttackStep = {
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
};

const SAMURAI_HIT_3: AttackStep = {
  ...SAMURAI_HIT_1,
  index: 3,
  windupMs: 116,
  activeMs: 100,
  recoveryMs: 200,
  damage: 34,
  hitKind: 'heavy',
  knockback: 140,
  knockbackLift: -60,
  arcDegrees: 180,
};

// docs/08-Enemy-System.md §6.1.3 — Skeleton Basic overhead swing.
const SKELETON_OVERHEAD_SWING: EnemyAttackStep = {
  id: 'overhead_swing',
  displayName: 'Overhead swing',
  windupMs: 600,
  activeMs: 133,
  recoverMs: 500,
  damage: 10,
  hitKind: 'light',
  hitbox: { w: 26, h: 26, ox: 10, oy: 0 },
  arcDegrees: 0,
  unblockable: false,
  minRange: 0,
  maxRange: 26,
  cooldownMs: 900,
  weight: 1,
  telegraph: { animKey: 'windup_overhead', flashOnFrame: 2, audioId: null, selfIlluminate: false },
};

interface VictimOpts {
  readonly id: EntityId;
  readonly isPlayer: boolean;
  readonly active: boolean;
  readonly hp: number;
  readonly poiseMax: number;
  readonly poiseRegenMs: number;
  readonly knockbackTaken: number;
  readonly knockbackResist: number;
  readonly armour: number;
  readonly poiseResist: number;
  readonly baseStaggerMs: number;
  readonly centre: { readonly x: number; readonly y: number };
  readonly facing: -1 | 1;
}

const VICTIM_DEFAULTS: VictimOpts = {
  id: 99,
  isPlayer: false,
  active: true,
  hp: 30,
  poiseMax: 12,
  poiseRegenMs: 1500,
  knockbackTaken: 1,
  knockbackResist: 0,
  armour: 0,
  poiseResist: 0,
  baseStaggerMs: 220,
  centre: { x: 0, y: 0 },
  facing: 1,
};

function makeVictim(overrides: Partial<VictimOpts> = {}): CombatVictim {
  const opts = { ...VICTIM_DEFAULTS, ...overrides };
  return {
    id: opts.id,
    isPlayer: opts.isPlayer,
    active: opts.active,
    health: new Health(opts.hp),
    poise: new Poise(opts.poiseMax, opts.poiseRegenMs),
    iFrames: new IFrames(),
    knockbackTaken: opts.knockbackTaken,
    knockbackResist: opts.knockbackResist,
    armour: opts.armour,
    poiseResist: opts.poiseResist,
    baseStaggerMs: opts.baseStaggerMs,
    centre: opts.centre,
    facing: opts.facing,
  };
}

function makeHit(opts: {
  readonly attackerId?: EntityId;
  readonly victimId?: EntityId;
  readonly step?: AttackStep | EnemyAttackStep | null;
  readonly source?: QueuedHit['source'];
  readonly x?: number;
}): QueuedHit {
  const hitbox = new Hitbox();
  const step = opts.step === undefined ? SAMURAI_HIT_1 : opts.step;
  if (step && 'index' in step) {
    hitbox.schedule(0, 0, step.activeMs, {
      width: step.rangeX,
      height: step.rangeY,
      offsetX: step.offsetX,
      offsetY: step.offsetY,
    });
  } else if (step) {
    hitbox.schedule(0, 0, step.activeMs, {
      width: step.hitbox.w,
      height: step.hitbox.h,
      offsetX: step.hitbox.ox,
      offsetY: step.hitbox.oy,
    });
  } else {
    hitbox.schedule(0, 0, 40, { width: 10, height: 10, offsetX: 0, offsetY: 0 });
  }
  return {
    hitbox,
    attackerId: opts.attackerId ?? 1,
    victimId: opts.victimId ?? 99,
    point: { x: opts.x ?? 10, y: 0 },
    source: opts.source ?? 'melee',
    step,
  };
}

interface SinkCall {
  readonly name: string;
  readonly args: readonly unknown[];
}

function makeRecordingSinks(): { readonly sinks: CombatSinks; readonly calls: SinkCall[] } {
  const calls: SinkCall[] = [];
  const rec =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push({ name, args });
    };
  const sinks: CombatSinks = {
    requestHitStop: rec('requestHitStop'),
    applyFlash: rec('applyFlash'),
    applyKnockback: rec('applyKnockback'),
    spawnSlashVfx: rec('spawnSlashVfx'),
    addCameraTrauma: rec('addCameraTrauma'),
    burstParticles: rec('burstParticles'),
    applyStagger: rec('applyStagger'),
    spawnDamageNumber: rec('spawnDamageNumber'),
    applyDeath: rec('applyDeath'),
    emitHit: rec('emitHit'),
    // Run synchronously — the real Phaser delayedCall timing is a T6-T8 adapter concern.
    delay: (ms, cb) => {
      calls.push({ name: 'delay', args: [ms] });
      cb();
    },
  };
  return { sinks, calls };
}

// ---------------------------------------------------------------------------
// §7.2 worked examples — regression fixtures, locked to the doc's exact numbers.
// ---------------------------------------------------------------------------
describe('computeDamage — §7.1/§7.2 worked examples (regression)', () => {
  it('Example A — Samurai combo hit 1 on a basic Skeleton: 22', () => {
    expect(computeDamage(22, 0)).toBe(22);
  });

  it('Example B — Knight parry-critical on an Orc: round(18×2.0×1.15×1.0×0.80) = 33', () => {
    const dmg = computeDamage(18, 0.2, {
      attackMultiplier: 2.0,
      charmMultiplier: 1.15,
      assistMultiplier: 1.0,
      guardMultiplier: 1.0,
    });
    expect(dmg).toBe(33);
  });

  it('Example C — Skeleton hits a guarding Knight: round(10×0.25) = 3', () => {
    const dmg = computeDamage(10, 0, {
      attackMultiplier: 1,
      charmMultiplier: 1,
      assistMultiplier: 1,
      guardMultiplier: 0.25,
    });
    expect(dmg).toBe(3);
  });

  it('Example D — Assist damage reduction at 50%: round(10×0.5) = 5', () => {
    const dmg = computeDamage(10, 0, {
      attackMultiplier: 1,
      charmMultiplier: 1,
      assistMultiplier: 0.5,
      guardMultiplier: 1,
    });
    expect(dmg).toBe(5);
  });

  it('clamps to a minimum of 1 — never zero via the formula', () => {
    expect(
      computeDamage(1, 0.5, {
        attackMultiplier: 0.01,
        charmMultiplier: 1,
        assistMultiplier: 1,
        guardMultiplier: 1,
      }),
    ).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// §9.3 same-frame resolution order.
// ---------------------------------------------------------------------------
describe('compareHitPriority — §9.3 rule 1 (fatal DESC, damage DESC, attackerIsPlayer DESC)', () => {
  it('a fatal hit sorts before a non-fatal one regardless of damage', () => {
    const fatal = { fatal: true, damage: 5, attackerIsPlayer: false };
    const big = { fatal: false, damage: 999, attackerIsPlayer: false };
    expect(compareHitPriority(fatal, big)).toBeLessThan(0);
  });

  it('higher damage sorts first when fatality ties', () => {
    const a = { fatal: false, damage: 30, attackerIsPlayer: false };
    const b = { fatal: false, damage: 10, attackerIsPlayer: false };
    expect(compareHitPriority(a, b)).toBeLessThan(0);
  });

  it('player attacker sorts first when fatal and damage tie', () => {
    const player = { fatal: false, damage: 10, attackerIsPlayer: true };
    const enemy = { fatal: false, damage: 10, attackerIsPlayer: false };
    expect(compareHitPriority(player, enemy)).toBeLessThan(0);
  });
});

// ---------------------------------------------------------------------------
// buildResolution — pure, per-field.
// ---------------------------------------------------------------------------
describe('buildResolution', () => {
  it('poise damage always equals base damage, unaffected by multipliers (§7.3)', () => {
    const hit = makeHit({ step: SAMURAI_HIT_1 });
    const victim = makeVictim({ hp: 100 });
    const res = buildResolution(hit, victim, undefined, {
      attackMultiplier: 2,
      charmMultiplier: 1.3,
      assistMultiplier: 1,
      guardMultiplier: 1,
    });
    expect(res.poiseDamage).toBe(22); // base, not the multiplied `damage`
    expect(res.damage).toBeGreaterThan(22);
  });

  it('fatal adds the kill hit-stop and trauma bonus, and switches flash to pure white', () => {
    const hit = makeHit({ step: SAMURAI_HIT_1 }); // 22 dmg, light tier (60ms hitstop)
    const victim = makeVictim({ hp: 10 }); // dies
    const res = buildResolution(hit, victim);
    expect(res.fatal).toBe(true);
    expect(res.hitStopMs).toBe(90); // 60 + 30 kill bonus
    expect(res.flashColour).toBe(0xffffff);
  });

  it('a step overrides the tier default for knockback and vfxAngleDeg', () => {
    const hit = makeHit({ step: SAMURAI_HIT_3, x: 5 }); // heavy, 140 speed, -60 lift
    const victim = makeVictim({ hp: 100 });
    const res = buildResolution(hit, victim);
    expect(res.knockback.speed).toBe(140); // step value, not tier default
    expect(res.knockback.liftY).toBe(-60);
    expect(res.vfxAngleDeg).toBe(45); // SAMURAI_HIT_3 spreads HIT_1's vfxAngleDeg, unmodified
  });

  it('knockback scales by victim knockbackTaken and (1 - knockbackResist)', () => {
    const hit = makeHit({ step: SAMURAI_HIT_1 });
    // poiseMax 12 < 22 poise damage, so this hit breaks poise — poiseScale is 1.0, isolating
    // the taken/resist factors under test here from the poiseScale test below.
    const victim = makeVictim({ hp: 100, knockbackTaken: 1.25, knockbackResist: 0.5 });
    const res = buildResolution(hit, victim);
    expect(res.knockback.speed).toBeCloseTo(70 * 1.25 * 0.5, 5);
  });

  it('a poise-intact victim receives only 35% knockback — this is what makes heavy enemies feel heavy (§6.4)', () => {
    const hit = makeHit({ step: SAMURAI_HIT_1 }); // 22 poise damage
    const intact = buildResolution(hit, makeVictim({ hp: 100, poiseMax: 60 })); // 60-22=38, intact
    expect(intact.knockback.speed).toBeCloseTo(70 * 0.35, 5);

    const broken = buildResolution(hit, makeVictim({ hp: 100, poiseMax: 12 })); // 12-22<=0, broken
    expect(broken.knockback.speed).toBe(70); // full — poiseScale 1.0
  });

  it('knockback direction is Math.sign(victim.x - attacker.x) (§6.4)', () => {
    const hit = makeHit({ step: SAMURAI_HIT_1 });
    const victim = makeVictim({ hp: 100, poiseMax: 12, centre: { x: 100, y: 0 } });

    const attackerLeft = { x: 50, y: 0 };
    expect(buildResolution(hit, victim, attackerLeft).knockback.dirX).toBe(1); // pushed right

    const attackerRight = { x: 150, y: 0 };
    expect(buildResolution(hit, victim, attackerRight).knockback.dirX).toBe(-1); // pushed left
  });

  it('exact positional alignment defaults knockback direction to +1 (no facing at this layer)', () => {
    const hit = makeHit({ step: SAMURAI_HIT_1 });
    const victim = makeVictim({ hp: 100, poiseMax: 12, centre: { x: 100, y: 0 } });
    expect(buildResolution(hit, victim, { x: 100, y: 0 }).knockback.dirX).toBe(1);
  });

  it('an EnemyAttackStep (no knockback/vfxAngleDeg fields) falls back to the tier defaults (M2-T9)', () => {
    const hit = makeHit({ step: SKELETON_OVERHEAD_SWING });
    // poiseMax 5 < 10 dmg breaks poise, isolating the fallback from the separate 35% scale.
    const res = buildResolution(hit, makeVictim({ hp: 100, poiseMax: 5 }));
    expect(res.damage).toBe(10);
    expect(res.kind).toBe('light');
    expect(res.knockback.speed).toBeCloseTo(70, 5); // HIT_TIERS.light.knockbackSpeed, not a step override
    expect(res.vfxAngleDeg).toBe(0); // no per-step angle exists for enemy attacks
  });

  it('poise-broken stagger scales by (1 - poiseResist); intact poise is a flat 100ms flinch', () => {
    const hit = makeHit({ step: SAMURAI_HIT_1 }); // 22 poise damage
    const broken = buildResolution(
      hit,
      makeVictim({ hp: 100, poiseMax: 12, poiseResist: 0.5, baseStaggerMs: 220 }),
    );
    expect(broken.staggerMs).toBe(110); // 220 * (1 - 0.5)

    const intact = buildResolution(hit, makeVictim({ hp: 100, poiseMax: 60 })); // 60-22=38 > 0
    expect(intact.staggerMs).toBe(100);
  });

  it('numberStyle: critical > magic > playerDamage > normal', () => {
    const hit = makeHit({ step: SAMURAI_HIT_1 });
    const crit = buildResolution(hit, makeVictim({ hp: 100 }), undefined, {
      attackMultiplier: 2,
      charmMultiplier: 1,
      assistMultiplier: 1,
      guardMultiplier: 1,
    });
    expect(crit.numberStyle).toBe('critical');

    const magicHit = makeHit({ step: { ...SAMURAI_HIT_1, hitKind: 'magic' } });
    expect(buildResolution(magicHit, makeVictim({ hp: 100 })).numberStyle).toBe('magic');

    const onPlayer = buildResolution(hit, makeVictim({ hp: 100, isPlayer: true }));
    expect(onPlayer.numberStyle).toBe('playerDamage');

    const onEnemy = buildResolution(hit, makeVictim({ hp: 100, isPlayer: false }));
    expect(onEnemy.numberStyle).toBe('normal');
  });

  it('contact/hazard sources with no step resolve kind from the source directly', () => {
    const hazard = makeHit({ step: null, source: 'hazard' });
    const res = buildResolution(hazard, makeVictim({ hp: 100 }));
    expect(res.kind).toBe('hazard');
    expect(res.hitStopMs).toBe(0); // hazard tier has zero hit stop (§6.2)
  });

  it('attackInstanceId comes from the hitbox activation identity', () => {
    const hit = makeHit({ step: SAMURAI_HIT_1 });
    const res = buildResolution(hit, makeVictim({ hp: 100 }));
    expect(res.attackInstanceId).toBe(hit.hitbox.instance);
  });
});

// ---------------------------------------------------------------------------
// CombatSystem.resolveQueuedHits — the M2-T5 Verify: "all nine side effects fire".
// ---------------------------------------------------------------------------
describe('CombatSystem.resolveQueuedHits — nine layers fire on one hit (Verify)', () => {
  it('calls every sink exactly once for a single non-fatal, poise-breaking hit', () => {
    const queue = new HitQueue();
    const attacker = makeVictim({ id: 1, isPlayer: true, hp: 100 });
    const victim = makeVictim({ id: 99, hp: 100, poiseMax: 12 }); // 22 dmg breaks poise
    const victims = new Map([
      [attacker.id, attacker],
      [victim.id, victim],
    ]);
    const { sinks, calls } = makeRecordingSinks();
    const combat = new CombatSystem(queue, victims, sinks, () => 1000);

    combat.queueHit(makeHit({ attackerId: 1, victimId: 99, step: SAMURAI_HIT_1 }));
    combat.resolveQueuedHits();

    const names = calls.map(c => c.name);
    // Layers 1-5, 8 synchronous; delay wraps 6+7 (+ poise_break burst); 9 fires when fatal.
    expect(names).toContain('requestHitStop'); // Layer 1
    expect(names).toContain('applyFlash'); // Layer 2
    expect(names).toContain('applyKnockback'); // Layer 3
    expect(names).toContain('spawnSlashVfx'); // Layer 4
    expect(names).toContain('addCameraTrauma'); // Layer 5
    expect(names.filter(n => n === 'burstParticles')).toHaveLength(2); // Layer 8: hit + poise_break
    expect(names).toContain('applyStagger'); // Layer 6
    expect(names).toContain('spawnDamageNumber'); // Layer 7
    expect(names).not.toContain('applyDeath'); // Layer 9 — not fatal, must NOT fire
    expect(names).toContain('emitHit');
  });

  it('positions the slash VFX 40% of the way from the contact point toward the victim centre (§6.5)', () => {
    const queue = new HitQueue();
    const attacker = makeVictim({ id: 1, isPlayer: true, hp: 100 });
    const victim = makeVictim({ id: 99, hp: 100, poiseMax: 12, centre: { x: 100, y: 0 } });
    const victims = new Map([
      [attacker.id, attacker],
      [victim.id, victim],
    ]);
    const { sinks, calls } = makeRecordingSinks();
    const combat = new CombatSystem(queue, victims, sinks, () => 0);

    combat.queueHit(
      makeHit({ attackerId: 1, victimId: 99, step: SAMURAI_HIT_1, x: 0 }), // contact at x=0
    );
    combat.resolveQueuedHits();

    const vfx = calls.find(c => c.name === 'spawnSlashVfx');
    expect(vfx).toBeDefined();
    const point = vfx?.args[1] as { x: number; y: number } | undefined;
    expect(point?.x).toBeCloseTo(40, 5); // 0 + (100 - 0) * 0.4 — NOT the raw contact point (0)
  });

  it('fires applyDeath (layer 9) only when the hit is fatal', () => {
    const queue = new HitQueue();
    const attacker = makeVictim({ id: 1, isPlayer: true, hp: 100 });
    const victim = makeVictim({ id: 99, hp: 5 }); // dies to 22 dmg
    const victims = new Map([
      [attacker.id, attacker],
      [victim.id, victim],
    ]);
    const { sinks, calls } = makeRecordingSinks();
    const combat = new CombatSystem(queue, victims, sinks, () => 0);

    combat.queueHit(makeHit({ attackerId: 1, victimId: 99, step: SAMURAI_HIT_1 }));
    combat.resolveQueuedHits();

    expect(calls.some(c => c.name === 'applyDeath')).toBe(true);
    const death = calls.find(c => c.name === 'applyDeath');
    expect((death?.args[1] as HitResolution).fatal).toBe(true);
  });

  it('applies damage and poise to the victim components directly', () => {
    const queue = new HitQueue();
    const attacker = makeVictim({ id: 1, isPlayer: true, hp: 100 });
    const victim = makeVictim({ id: 99, hp: 100, poiseMax: 60 });
    const victims = new Map([
      [attacker.id, attacker],
      [victim.id, victim],
    ]);
    const { sinks } = makeRecordingSinks();
    const combat = new CombatSystem(queue, victims, sinks, () => 0);

    combat.queueHit(makeHit({ attackerId: 1, victimId: 99, step: SAMURAI_HIT_1 }));
    combat.resolveQueuedHits();

    expect(victim.health.value).toBe(78); // 100 - 22
    expect(victim.poise.value).toBe(38); // 60 - 22
  });

  it('does not resolve a hit against a victim currently in i-frames', () => {
    const queue = new HitQueue();
    const attacker = makeVictim({ id: 1, isPlayer: true, hp: 100 });
    const victim = makeVictim({ id: 99, hp: 100 });
    victim.iFrames.grant(800, 0);
    const victims = new Map([
      [attacker.id, attacker],
      [victim.id, victim],
    ]);
    const { sinks, calls } = makeRecordingSinks();
    const combat = new CombatSystem(queue, victims, sinks, () => 100); // still within the window

    combat.queueHit(makeHit({ attackerId: 1, victimId: 99, step: SAMURAI_HIT_1 }));
    combat.resolveQueuedHits();

    expect(calls).toHaveLength(0);
    expect(victim.health.value).toBe(100);
  });

  it('per-activation dedup: the same Hitbox instance cannot hit one victim twice', () => {
    const queue = new HitQueue();
    const attacker = makeVictim({ id: 1, isPlayer: true, hp: 100 });
    const victim = makeVictim({ id: 99, hp: 100 });
    const victims = new Map([
      [attacker.id, attacker],
      [victim.id, victim],
    ]);
    const { sinks, calls } = makeRecordingSinks();
    const combat = new CombatSystem(queue, victims, sinks, () => 0);

    const hit = makeHit({ attackerId: 1, victimId: 99, step: SAMURAI_HIT_1 });
    combat.queueHit(hit);
    combat.queueHit(hit); // same Hitbox instance, e.g. two overlap frames in one batch
    combat.resolveQueuedHits();

    expect(calls.filter(c => c.name === 'requestHitStop')).toHaveLength(1);
    expect(victim.health.value).toBe(78); // damaged exactly once
  });

  it('§9.3 rule 7: once a victim dies mid-batch, later queued hits on them are discarded', () => {
    const queue = new HitQueue();
    const attacker = makeVictim({ id: 1, isPlayer: true, hp: 100 });
    const victim = makeVictim({ id: 99, hp: 20 }); // first hit (22 dmg) kills
    const victims = new Map([
      [attacker.id, attacker],
      [victim.id, victim],
    ]);
    const { sinks, calls } = makeRecordingSinks();
    const combat = new CombatSystem(queue, victims, sinks, () => 0);

    // Two independently-scheduled swings landing the same batch (distinct Hitbox instances,
    // so dedup alone would not stop the second one).
    combat.queueHit(makeHit({ attackerId: 1, victimId: 99, step: SAMURAI_HIT_1 }));
    combat.queueHit(makeHit({ attackerId: 1, victimId: 99, step: SAMURAI_HIT_1 }));
    combat.resolveQueuedHits();

    expect(calls.filter(c => c.name === 'requestHitStop')).toHaveLength(1);
    expect(victim.health.isDead).toBe(true);
  });

  it('priority sort: a fatal hit on one victim resolves before a bigger non-fatal hit on another', () => {
    const queue = new HitQueue();
    const attacker = makeVictim({ id: 1, isPlayer: true, hp: 100 });
    const fragile = makeVictim({ id: 2, hp: 5 }); // 22 dmg is fatal
    const tanky = makeVictim({ id: 3, hp: 1000 }); // never dies
    const victims = new Map([
      [attacker.id, attacker],
      [fragile.id, fragile],
      [tanky.id, tanky],
    ]);
    const order: number[] = [];
    const { sinks } = makeRecordingSinks();
    const tracking: CombatSinks = {
      ...sinks,
      requestHitStop: (_ms, participants) => order.push(participants[1] as number),
    };
    const combat = new CombatSystem(queue, victims, tracking, () => 0);

    combat.queueHit(makeHit({ attackerId: 1, victimId: 3, step: SAMURAI_HIT_3 })); // bigger dmg, not fatal
    combat.queueHit(makeHit({ attackerId: 1, victimId: 2, step: SAMURAI_HIT_1 })); // smaller, fatal
    combat.resolveQueuedHits();

    expect(order).toEqual([2, 3]); // fatal (id 2) resolves first despite queuing second
  });

  it('drains the queue — resolving twice in a row does nothing the second time', () => {
    const queue = new HitQueue();
    const attacker = makeVictim({ id: 1, isPlayer: true, hp: 100 });
    const victim = makeVictim({ id: 99, hp: 100 });
    const victims = new Map([
      [attacker.id, attacker],
      [victim.id, victim],
    ]);
    const { sinks, calls } = makeRecordingSinks();
    const combat = new CombatSystem(queue, victims, sinks, () => 0);

    combat.queueHit(makeHit({ attackerId: 1, victimId: 99, step: SAMURAI_HIT_1 }));
    combat.resolveQueuedHits();
    const countAfterFirst = calls.length;
    combat.resolveQueuedHits();
    expect(calls.length).toBe(countAfterFirst);
  });
});
