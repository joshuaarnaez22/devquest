import {
  DEATH_VFX,
  FLASH_COLOUR,
  HIT_TIERS,
  KILL_BONUS,
  PARTICLE_FOR_HIT_KIND,
  type DamageNumberStyle,
  type HitKind,
  type ParticleId,
  type VfxId,
} from '@config/CombatFeedback';
import type { AttackStep } from '@components/AttackStep';
import type { Health } from '@components/Health';
import type { IFrames } from '@components/IFrames';
import type { Poise } from '@components/Poise';
import type { EntityId, Vec2 } from '@core/GameEvents';
import type { HitQueue, QueuedHit } from '@systems/HitQueue';

/**
 * `AttackStep` (player) has `index: 1|2|3`; `EnemyAttackStep` has `id: string` and no
 * `index` at all — a reliable discriminant between the two `QueuedHit.step` union
 * members. Enemy attacks carry no per-step knockback/vfxAngleDeg override (§8's
 * schema has none), so those always fall back to the `HIT_TIERS[kind]` default.
 */
function isPlayerAttackStep(step: NonNullable<QueuedHit['step']>): step is AttackStep {
  return 'index' in step;
}

/**
 * Every field required — omitting a feedback layer is a compile error, not a runtime
 * gap (docs/07-Combat.md §6.1). This is Pillar 2's falsification test #1 enforced by
 * the type system.
 */
export interface HitResolution {
  readonly attacker: EntityId;
  readonly victim: EntityId;
  readonly attackInstanceId: number;
  readonly point: Readonly<Vec2>;
  readonly kind: HitKind;

  readonly damage: number;
  readonly poiseDamage: number;
  readonly fatal: boolean;

  readonly hitStopMs: number;

  readonly flashMs: number;
  readonly flashColour: number;

  readonly knockback: Readonly<{
    readonly speed: number;
    readonly dirX: -1 | 1;
    readonly liftY: number;
    readonly decayMs: number;
  }>;

  readonly vfxId: VfxId;
  readonly vfxAngleDeg: number;

  /**
   * NOT independently specified by §6.6 — that section only gives per-kind `trauma`,
   * consumed via `CameraSystem.addTrauma` (see `applyResolution` in §11.1, which reads
   * `res.kind`/`res.fatal`, never `res.shake`). Derived here from already-normative
   * `HIT_TIERS` fields (trauma → amplitude, hitStopMs → durationMs) rather than
   * inventing new numbers. Flag for review if a distinct per-kind shake table exists.
   */
  readonly shake: Readonly<{ readonly amplitude: number; readonly durationMs: number }>;

  readonly staggerMs: number;

  readonly numberStyle: DamageNumberStyle;

  readonly particleId: ParticleId;
  readonly particleCount: number;

  /** Only meaningful when `fatal`. Elite/boss selection lands with M4+ content. */
  readonly deathVfxId: VfxId;
}

/** §7.1 — every term present even where it is 1.0 in M2 (charms/assist/guard land later). */
export interface DamageFormulaInputs {
  readonly attackMultiplier: number; // 2.0 parry-critical, else 1.0
  readonly charmMultiplier: number; // product of equipped charms, 0.8-1.3 (M6)
  readonly assistMultiplier: number; // player-damage-taken only (M11)
  readonly guardMultiplier: number; // 0.25 Knight guarding from front, else 1.0 (M2-T11)
}

export const DEFAULT_FORMULA_INPUTS: DamageFormulaInputs = {
  attackMultiplier: 1,
  charmMultiplier: 1,
  assistMultiplier: 1,
  guardMultiplier: 1,
};

/** What CombatSystem needs from a hit's target — not the concrete Entity/FeelPlayer. */
export interface CombatVictim {
  readonly id: EntityId;
  readonly isPlayer: boolean;
  readonly active: boolean;
  readonly health: Health;
  readonly poise: Poise;
  readonly iFrames: IFrames;
  /** Character/enemy stat, 0.6-1.3 (§6.4). */
  readonly knockbackTaken: number;
  /** Enemy stat, 0.0-0.9; 0 for the player (§6.4). */
  readonly knockbackResist: number;
  /** `victimArmour`, 0.0-0.5; 0 for the player (§7.1). */
  readonly armour: number;
  /** Stagger duration scale, 0..1 (§6.7). */
  readonly poiseResist: number;
  /** Full-stagger duration for this entity type, ms (§6.7, §8.2). */
  readonly baseStaggerMs: number;
  /** World-space centre, for knockback direction (§6.4) and VFX positioning (§6.5). */
  readonly centre: Readonly<Vec2>;
  /** −1/+1, for `onIncomingDamage`'s `fromBehind` (docs/06 §9.1 — Knight's Guard). */
  readonly facing: -1 | 1;
  /** Optional damage interception (docs/06 §9.1) — Knight's Guard is the only user today. */
  onIncomingDamage?(damage: number, source: EntityId, fromBehind: boolean): number;
}

/**
 * The nine feedback layers as an injected fan-out contract (§10 — CombatSystem calls
 * into consumers, nothing calls into CombatSystem). Layers 1-5 and 8 fire synchronously
 * at resolution time; layers 6-7 (plus the poise-break particle burst) are deferred by
 * `delay(hitStopMs, …)` so the stagger/number are visible rather than eaten by the
 * freeze (§6.7); layer 9 fires synchronously alongside them (§11.1's `applyDeath` is
 * called outside the delayed block). `delay` is scheduling infrastructure, not a layer.
 */
export interface CombatSinks {
  requestHitStop(ms: number, participants: readonly EntityId[]): void;
  applyFlash(victimId: EntityId, colour: number, flashMs: number): void;
  applyKnockback(victimId: EntityId, knockback: HitResolution['knockback']): void;
  spawnSlashVfx(vfxId: VfxId, point: Readonly<Vec2>, angleDeg: number): void;
  addCameraTrauma(amount: number): void;
  burstParticles(particleId: ParticleId, point: Readonly<Vec2>, count: number): void;
  applyStagger(victimId: EntityId, staggerMs: number, poiseBroken: boolean): void;
  spawnDamageNumber(damage: number, point: Readonly<Vec2>, style: DamageNumberStyle): void;
  applyDeath(victimId: EntityId, res: HitResolution): void;
  emitHit(res: HitResolution): void;
  delay(ms: number, cb: () => void): void;
}

/** Trauma added on top of a hit's own tier trauma when the hit is fatal (§6.6). */
function traumaFor(kind: HitKind, fatal: boolean): number {
  const base = HIT_TIERS[kind].trauma;
  return fatal ? base + KILL_BONUS.trauma : base;
}

/** §7.1 — clamped to a minimum of 1; never zero except explicit block/parry paths (M2-T11). */
export function computeDamage(
  baseDamage: number,
  victimArmour: number,
  inputs: DamageFormulaInputs = DEFAULT_FORMULA_INPUTS,
): number {
  const raw =
    baseDamage *
    inputs.attackMultiplier *
    inputs.charmMultiplier *
    inputs.assistMultiplier *
    (1 - victimArmour) *
    inputs.guardMultiplier;
  return Math.max(1, Math.round(raw));
}

/** §9.3 same-frame ordering: fatal DESC, damage DESC, attackerIsPlayer DESC. */
export function compareHitPriority(
  a: { readonly fatal: boolean; readonly damage: number; readonly attackerIsPlayer: boolean },
  b: { readonly fatal: boolean; readonly damage: number; readonly attackerIsPlayer: boolean },
): number {
  if (a.fatal !== b.fatal) return a.fatal ? -1 : 1;
  if (a.damage !== b.damage) return b.damage - a.damage;
  if (a.attackerIsPlayer !== b.attackerIsPlayer) return a.attackerIsPlayer ? -1 : 1;
  return 0;
}

/**
 * `QueuedHit.source` (how the overlap was detected) and `HitKind` (the feedback tier)
 * overlap but are not the same vocabulary. A melee hit's kind comes from its
 * `AttackStep.hitKind` (light/heavy for the Samurai combo); contact/hazard sources map
 * 1:1. `projectile` has no ranged-attack model yet (Wizard's is M2-T11) — defaulted to
 * `ranged` as the closest fit, flagged for when a real projectile step exists.
 */
function resolveHitKind(hit: QueuedHit): HitKind {
  if (hit.step !== null) return hit.step.hitKind;
  if (hit.source === 'contact' || hit.source === 'hazard') return hit.source;
  return 'ranged'; // 'melee' with no step, or 'projectile' — no model yet, placeholder
}

/**
 * §6.4 — step overrides win (more precise than the generic tier); knockbackTaken/resist
 * scale it, and a poise-intact victim receives only 35% (`poiseScale`) — this is what
 * makes a heavy enemy feel heavy: it shrugs off light hits and only launches once broken.
 */
function computeKnockback(
  hit: QueuedHit,
  tier: HitResolution['knockback'] & { readonly decayMs: number },
  victim: CombatVictim,
  ctx: { readonly attackerCentre: Readonly<Vec2>; readonly poiseBroken: boolean },
): HitResolution['knockback'] {
  const playerStep = hit.step !== null && isPlayerAttackStep(hit.step) ? hit.step : null;
  const baseSpeed = playerStep?.knockback ?? tier.speed;
  const lift = playerStep?.knockbackLift ?? tier.liftY;
  // Math.sign(victim.x - attacker.x) (§6.4); exact alignment has no facing to fall back
  // on at this layer (CombatVictim carries no facing), so it defaults to +1.
  const diff = victim.centre.x - ctx.attackerCentre.x;
  const dirX: -1 | 1 = diff === 0 ? 1 : diff > 0 ? 1 : -1;
  const poiseScale = ctx.poiseBroken ? 1.0 : 0.35;
  return {
    speed: baseSpeed * victim.knockbackTaken * (1 - victim.knockbackResist) * poiseScale,
    dirX,
    liftY: lift,
    decayMs: tier.decayMs,
  };
}

function lerpPoint(a: Readonly<Vec2>, b: Readonly<Vec2>, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** §6.7 — full stagger scaled by poise resist when broken, else a flat 100ms flinch. */
function computeStagger(poiseBroken: boolean, victim: CombatVictim): number {
  return poiseBroken ? victim.baseStaggerMs * (1 - victim.poiseResist) : 100;
}

/** §6.8 — the four style branches reachable without guard/heal systems (M2-T11+). */
function computeNumberStyle(
  kind: HitKind,
  isCritical: boolean,
  isPlayer: boolean,
): DamageNumberStyle {
  if (isCritical) return 'critical';
  if (kind === 'magic') return 'magic';
  return isPlayer ? 'playerDamage' : 'normal';
}

/**
 * Pure: builds the full `HitResolution` for one queued hit against its (not-yet-damaged)
 * victim. Damage/poise damage from §7.1/§7.3; the rest defaults from `HIT_TIERS[kind]`,
 * with the melee step's own knockback/vfxAngleDeg overriding the tier default where a
 * step is present (a step's numbers are more precise than the generic tier).
 *
 * `attackerCentre` defaults to the victim's own centre (a neutral "no direction info"
 * stand-in — resolves knockback `dirX` to +1) for callers that only care about damage/
 * timing math and not positioning; `CombatSystem.resolveQueuedHits` always supplies the
 * real attacker position.
 */
export function buildResolution(
  hit: QueuedHit,
  victim: CombatVictim,
  attackerCentre: Readonly<Vec2> = victim.centre,
  formula: DamageFormulaInputs = DEFAULT_FORMULA_INPUTS,
): HitResolution {
  const kind = resolveHitKind(hit);
  const tier = HIT_TIERS[kind];
  const baseDamage = hit.step?.damage ?? 0;
  let damage = computeDamage(baseDamage, victim.armour, formula);
  if (victim.onIncomingDamage !== undefined) {
    const dx = attackerCentre.x - victim.centre.x;
    const fromBehind = dx !== 0 && Math.sign(dx) !== victim.facing;
    damage = victim.onIncomingDamage(damage, hit.attackerId, fromBehind);
  }
  const fatal = victim.health.value - damage <= 0;
  const poiseBroken = victim.poise.value - baseDamage <= 0;

  return {
    attacker: hit.attackerId,
    victim: hit.victimId,
    attackInstanceId: hit.hitbox.instance,
    point: hit.point,
    kind,

    damage,
    poiseDamage: baseDamage,
    fatal,

    hitStopMs: fatal ? tier.hitStopMs + KILL_BONUS.hitStopMs : tier.hitStopMs,

    flashMs: tier.flashMs,
    flashColour: fatal ? FLASH_COLOUR.fatal : FLASH_COLOUR.normal,

    knockback: computeKnockback(
      hit,
      {
        speed: tier.knockbackSpeed,
        dirX: 1,
        liftY: tier.knockbackLift,
        decayMs: tier.knockbackDecayMs,
      },
      victim,
      { attackerCentre, poiseBroken },
    ),

    vfxId: tier.vfxId,
    vfxAngleDeg: hit.step !== null && isPlayerAttackStep(hit.step) ? hit.step.vfxAngleDeg : 0,

    shake: { amplitude: tier.trauma, durationMs: tier.hitStopMs },

    staggerMs: computeStagger(poiseBroken, victim),

    numberStyle: computeNumberStyle(kind, formula.attackMultiplier >= 2, victim.isPlayer),

    particleId: PARTICLE_FOR_HIT_KIND[kind],
    particleCount: tier.particleCount,

    deathVfxId: DEATH_VFX.normal,
  };
}

/**
 * Resolves everything queued since the last drain (§11.1). Damage/poise apply
 * immediately; the nine feedback layers fan out to `sinks`. `resolveQueuedHits` is
 * called once per frame, AFTER the physics step (§10.1) — never from inside an
 * overlap callback.
 */
export class CombatSystem {
  constructor(
    private readonly queue: HitQueue,
    private readonly victims: ReadonlyMap<EntityId, CombatVictim>,
    private readonly sinks: CombatSinks,
    private readonly now: () => number,
  ) {}

  queueHit(hit: QueuedHit): void {
    this.queue.queue(hit);
  }

  resolveQueuedHits(): void {
    const batch = this.queue.drain();
    if (batch.length === 0) return;

    const withVictims = batch
      .map(hit => ({ hit, victim: this.victims.get(hit.victimId) }))
      .filter((x): x is { hit: QueuedHit; victim: CombatVictim } => x.victim !== undefined);

    const scored = withVictims.map(({ hit, victim }) => {
      const baseDamage = hit.step?.damage ?? 0;
      const formula =
        hit.critical === true
          ? { ...DEFAULT_FORMULA_INPUTS, attackMultiplier: 2 }
          : DEFAULT_FORMULA_INPUTS;
      const damage = computeDamage(baseDamage, victim.armour, formula);
      const attackerIsPlayer = this.victims.get(hit.attackerId)?.isPlayer ?? false;
      return {
        hit,
        victim,
        fatal: victim.health.value - damage <= 0,
        damage,
        attackerIsPlayer,
      };
    });

    scored.sort(compareHitPriority);

    for (const { hit, victim } of scored) {
      if (!victim.active) continue;
      if (victim.health.isDead) continue; // covers §9.3 rule 7 — later hits on a dead victim
      if (victim.iFrames.isActive(this.now())) continue;
      if (!hit.hitbox.canHit(hit.victimId)) continue;

      hit.hitbox.markHit(hit.victimId);
      const attackerCentre = this.victims.get(hit.attackerId)?.centre ?? victim.centre;
      const formula =
        hit.critical === true
          ? { ...DEFAULT_FORMULA_INPUTS, attackMultiplier: 2 }
          : DEFAULT_FORMULA_INPUTS;
      const res = buildResolution(hit, victim, attackerCentre, formula);
      this.applyResolution(res, victim);
    }
  }

  private applyResolution(res: HitResolution, victim: CombatVictim): void {
    const now = this.now();
    victim.health.damage(res.damage);
    const poiseBroken = victim.poise.damage(res.poiseDamage, now);

    this.sinks.requestHitStop(res.hitStopMs, [res.attacker, res.victim]);
    this.sinks.applyFlash(res.victim, res.flashColour, res.flashMs);
    this.sinks.applyKnockback(res.victim, res.knockback);
    // Slash VFX draws 40% of the way from the contact point toward the victim's centre
    // (§6.5) — on the attacker reads as a whiff. res.point itself stays the raw contact
    // point for particles/damage numbers, which use no such offset.
    this.sinks.spawnSlashVfx(res.vfxId, lerpPoint(res.point, victim.centre, 0.4), res.vfxAngleDeg);
    this.sinks.addCameraTrauma(traumaFor(res.kind, res.fatal));
    this.sinks.burstParticles(res.particleId, res.point, res.particleCount);

    this.sinks.delay(res.hitStopMs, () => {
      if (!victim.active) return;
      this.sinks.applyStagger(res.victim, res.staggerMs, poiseBroken);
      this.sinks.spawnDamageNumber(res.damage, res.point, res.numberStyle);
      if (poiseBroken) this.sinks.burstParticles('poise_break', res.point, 12);
    });

    if (res.fatal) this.sinks.applyDeath(res.victim, res);

    this.sinks.emitHit(res);
  }
}
