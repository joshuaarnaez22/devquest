import { aabbOverlap } from '@components/Box';
import { SKELETON_CONTACT, SKELETON_OVERHEAD_SWING } from '@entities/enemy/SkeletonCombat';
import { now } from '@platform/Clock';
import type { Aabb } from '@components/Box';
import type { EventBus } from '@core/EventBus';
import type { EntityId, GameEventMap } from '@core/GameEvents';
import type { Skeleton } from '@entities/enemy/Skeleton';
import type { FeelPlayer } from '@entities/player/FeelPlayer';
import type { CameraSystem } from '@systems/CameraSystem';
import type { CombatSinks, CombatVictim } from '@systems/CombatSystem';
import type { DamageNumberSystem } from '@systems/DamageNumberSystem';
import type { HitQueue, QueuedHit } from '@systems/HitQueue';
import type { HitStopSystem } from '@systems/HitStopSystem';
import type { KnockbackSystem } from '@systems/KnockbackSystem';
import type { ParticleSystem } from '@systems/ParticleSystem';
import type { VfxSystem } from '@systems/VfxSystem';
import type Phaser from 'phaser';

/**
 * GameScene's combat-wiring adapters (M2-T10), split out of `GameScene.ts` to keep
 * it under the file-length budget. Everything here takes its dependencies as plain
 * arguments/objects — no `Phaser.Scene` reference — so it stays a set of pure
 * adapter functions, not a second scene.
 */

/** `isSolidAt` for `Skeleton`'s `LedgeSensor` — point-in-static-group test over the
 * grey-box level's `solids`/`softs` groups (no tilemap collision exists until M3). */
export function isSolidAt(
  groups: readonly Phaser.Physics.Arcade.StaticGroup[],
  x: number,
  y: number,
): boolean {
  for (const group of groups) {
    const children = group.getChildren() as Phaser.Types.Physics.Arcade.GameObjectWithBody[];
    for (const child of children) {
      const b = child.body;
      if (x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) return true;
    }
  }
  return false;
}

export function buildCombatVictims(
  player: FeelPlayer,
  skeleton: Skeleton,
): ReadonlyMap<EntityId, CombatVictim> {
  const map = new Map<EntityId, CombatVictim>();
  map.set(player.id, {
    id: player.id,
    isPlayer: true,
    get active() {
      return player.active;
    },
    health: player.health,
    poise: player.poise,
    iFrames: player.damage.iFrames,
    knockbackTaken: player.knockbackTaken,
    knockbackResist: player.knockbackResist,
    armour: player.armour,
    poiseResist: player.poiseResist,
    baseStaggerMs: player.baseStaggerMs,
    get centre() {
      return player.centre;
    },
  });
  map.set(skeleton.id, {
    id: skeleton.id,
    isPlayer: false,
    get active() {
      return skeleton.active;
    },
    health: skeleton.health,
    poise: skeleton.poise,
    iFrames: skeleton.iFrames,
    knockbackTaken: skeleton.knockbackTaken,
    knockbackResist: skeleton.knockbackResist,
    armour: skeleton.armour,
    poiseResist: skeleton.poiseResist,
    baseStaggerMs: skeleton.baseStaggerMs,
    get centre() {
      return skeleton.centre;
    },
  });
  return map;
}

export interface CombatSinkDeps {
  readonly player: FeelPlayer;
  readonly skeleton: Skeleton;
  readonly hitStop: HitStopSystem;
  readonly knockbackSys: KnockbackSystem;
  readonly damageNumbers: DamageNumberSystem;
  readonly vfx: VfxSystem;
  readonly particles: ParticleSystem;
  readonly cameraSys: CameraSystem;
  readonly bus: EventBus<GameEventMap>;
  readonly delay: (ms: number, cb: () => void) => void;
}

export function makeCombatSinks(deps: CombatSinkDeps): CombatSinks {
  const { player, skeleton, hitStop, knockbackSys, damageNumbers, vfx, particles, cameraSys, bus } =
    deps;
  return {
    requestHitStop: (ms, participants) => hitStop.request(ms, participants),
    applyFlash: (victimId, colour, flashMs) => {
      if (victimId === player.id) {
        player.damage.hitFlash.start(colour, flashMs);
        player.applyDamage(now()); // synchronous — see FeelPlayer.applyDamage's doc comment (§9.3)
      } else if (victimId === skeleton.id) {
        skeleton.hitFlash.start(colour, flashMs);
      }
    },
    applyKnockback: (victimId, knockback) => knockbackSys.apply(victimId, knockback),
    spawnSlashVfx: (vfxId, point, angleDeg) => vfx.spawnSlash(vfxId, point, angleDeg),
    addCameraTrauma: amount => cameraSys.addTrauma(amount),
    burstParticles: (particleId, point, count) => particles.burst(particleId, point, count),
    applyStagger: (victimId, _staggerMs, poiseBroken) => {
      if (victimId === skeleton.id) skeleton.applyStagger(poiseBroken);
    },
    spawnDamageNumber: (damage, point, style) => damageNumbers.spawn(damage, point, style),
    applyDeath: (victimId, res) => {
      vfx.spawnDeathFlash(res.point);
      if (victimId === skeleton.id) {
        bus.emit('combat:kill', { victim: victimId, killer: res.attacker, enemyId: 'skeleton' });
      }
    },
    emitHit: res =>
      bus.emit('combat:hit', {
        attacker: res.attacker,
        victim: res.victim,
        damage: res.damage,
        kind: res.kind,
        point: res.point,
      }),
    delay: deps.delay,
  };
}

interface QueuedHitInput {
  readonly hitbox: QueuedHit['hitbox'];
  readonly attackerId: EntityId;
  readonly victimId: EntityId;
  readonly victimRect: Aabb;
  readonly source: QueuedHit['source'];
  readonly step: QueuedHit['step'];
}

function makeQueuedHit(input: QueuedHitInput): QueuedHit {
  return {
    hitbox: input.hitbox,
    attackerId: input.attackerId,
    victimId: input.victimId,
    point: {
      x: input.victimRect.x + input.victimRect.width / 2,
      y: input.victimRect.y + input.victimRect.height / 2,
    },
    source: input.source,
    step: input.step,
  };
}

function detectPlayerAttackOnSkeleton(
  player: FeelPlayer,
  skeleton: Skeleton,
  queue: HitQueue,
): void {
  const step = player.currentAttackStep;
  if (step === null) return;
  if (!player.attackHitbox.active || !skeleton.active || !skeleton.hurtbox.enabled) return;
  if (!player.attackHitbox.canHit(skeleton.id)) return;

  const hb = player.attackHitbox.rect(player.x, player.y, player.facingDir);
  const hurt = skeleton.hurtbox.rect(skeleton.x, skeleton.y, skeleton.facingDir);
  if (!aabbOverlap(hb, hurt)) return;

  queue.queue(
    makeQueuedHit({
      hitbox: player.attackHitbox,
      attackerId: player.id,
      victimId: skeleton.id,
      victimRect: hurt,
      source: 'melee',
      step,
    }),
  );
}

function detectSkeletonAttackOnPlayer(
  player: FeelPlayer,
  skeleton: Skeleton,
  queue: HitQueue,
): void {
  if (!skeleton.hitbox.active || !player.active) return;
  if (!skeleton.hitbox.canHit(player.id)) return;

  const hb = skeleton.hitbox.rect(skeleton.x, skeleton.y, skeleton.facingDir);
  const hurt = player.hurtbox.rect(player.x, player.y, player.facingDir);
  if (!aabbOverlap(hb, hurt)) return;

  queue.queue(
    makeQueuedHit({
      hitbox: skeleton.hitbox,
      attackerId: skeleton.id,
      victimId: player.id,
      victimRect: hurt,
      source: 'melee',
      step: SKELETON_OVERHEAD_SWING,
    }),
  );
}

function detectSkeletonContactOnPlayer(
  player: FeelPlayer,
  skeleton: Skeleton,
  queue: HitQueue,
): void {
  if (!skeleton.contactHitbox.active || !player.active) return;
  if (!skeleton.contactHitbox.canHit(player.id)) return;

  const hb = skeleton.contactHitbox.rect(skeleton.x, skeleton.y, skeleton.facingDir);
  const hurt = player.hurtbox.rect(player.x, player.y, player.facingDir);
  if (!aabbOverlap(hb, hurt)) return;

  queue.queue(
    makeQueuedHit({
      hitbox: skeleton.contactHitbox,
      attackerId: skeleton.id,
      victimId: player.id,
      victimRect: hurt,
      source: 'contact',
      step: SKELETON_CONTACT,
    }),
  );
}

/**
 * `COMBAT_OVERLAP_PAIRS` (docs/07 §5.4), checked directly against the two live
 * combatants rather than through Arcade zones/groups — `Hitbox`/`Hurtbox` are
 * deliberately Phaser-free (T2), and with exactly one enemy this scene, a manual
 * AABB check each frame is simpler and cheaper than standing up pooled zone objects
 * for a single pair. Called after physics, before `combat.resolveQueuedHits`
 * (docs/07 §10.1 — never resolved inside an overlap callback).
 */
export function detectCombatOverlaps(
  player: FeelPlayer,
  skeleton: Skeleton,
  queue: HitQueue,
): void {
  detectPlayerAttackOnSkeleton(player, skeleton, queue);
  detectSkeletonAttackOnPlayer(player, skeleton, queue);
  detectSkeletonContactOnPlayer(player, skeleton, queue);
}
