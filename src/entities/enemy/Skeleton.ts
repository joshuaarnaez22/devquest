import { Depth } from '@config/Depth';
import { expand, GENEROSITY } from '@components/Box';
import { enemyHitboxSpecFor } from '@components/EnemyAttackStep';
import { Facing } from '@components/Facing';
import { Health } from '@components/Health';
import { Hitbox } from '@components/Hitbox';
import { Hurtbox } from '@components/Hurtbox';
import { Knockback } from '@components/Knockback';
import { LedgeSensor } from '@components/LedgeSensor';
import { Poise } from '@components/Poise';
import { VisionCone } from '@components/VisionCone';
import {
  SKELETON_OVERHEAD_SWING,
  SKELETON_SENSE,
  SKELETON_STATS,
} from '@entities/enemy/SkeletonCombat';
import { resolveChaseVelocity, resolvePatrolVelocity } from '@entities/enemy/SkeletonMovement';
import {
  SKELETON_STATE_DURATION_MS,
  createSkeletonFsmHost,
  createSkeletonStateMachine,
} from '@entities/enemy/SkeletonStates';
import { Entity } from '@entities/Entity';
import { now } from '@platform/Clock';
import type { SolidAtCheck } from '@components/LedgeSensor';
import type { LineOfSightCheck } from '@components/VisionCone';
import type { Vec2 } from '@core/GameEvents';
import type { StateMachine } from '@core/StateMachine';
import type { SkeletonStateId } from '@entities/enemy/SkeletonStateId';
import type { SkeletonFsmHost } from '@entities/enemy/SkeletonStates';
import type Phaser from 'phaser';

const BODY_W = 14;
const BODY_H = 28;

/** Pull-based, like `FeelPlayer`'s `InputFrameSource` — `position` is null while no player exists. */
export interface TargetSource {
  readonly position: Readonly<Vec2> | null;
}

/**
 * Basic-tier Skeleton — docs/08-Enemy-System.md §6.1 (M2-T9). One class, numbers
 * inline, per ADR-004: extraction to the JSON `EnemyDefinition` framework (§9) is
 * M4's job, once a second enemy exists to generalise from.
 *
 * Not yet wired into `GameScene` (`COMBAT_OVERLAP_PAIRS`/`CombatSinks`) — that lands
 * in M2-T10 alongside player damage, per the plan. `receiveHit` is the seam T10 hangs
 * a live `CombatSinks` adapter off; until then this entity runs its full AI cycle
 * standalone against an injected target/tilemap-stub, which is exactly what T9's
 * verify criteria (full cycle runs, never walks off a ledge) need.
 */
export class Skeleton extends Entity {
  readonly health = new Health(SKELETON_STATS.maxHp);
  readonly poise = new Poise(SKELETON_STATS.poise, SKELETON_STATS.poiseRegenDelayMs);
  readonly knockback = new Knockback();
  readonly hitbox = new Hitbox();
  readonly hurtbox = new Hurtbox(
    expand(
      { width: BODY_W, height: BODY_H, offsetX: 0, offsetY: -BODY_H / 2 },
      GENEROSITY.ENEMY_HURTBOX,
    ),
  );

  private readonly facingC = new Facing(1);
  private readonly vision = new VisionCone(SKELETON_SENSE);
  private readonly ledge = new LedgeSensor();
  private readonly fsmHost: SkeletonFsmHost;
  private readonly fsm: StateMachine<SkeletonFsmHost, SkeletonStateId>;
  private readonly target: TargetSource;
  private readonly isSolidAt: SolidAtCheck;
  private readonly lineOfSightClear: LineOfSightCheck | undefined;
  private pendingPoiseBroken = false;
  private lastAttackUsedAt = -Infinity;

  constructor(opts: {
    readonly scene: Phaser.Scene;
    readonly x: number;
    readonly y: number;
    readonly target: TargetSource;
    readonly isSolidAt: SolidAtCheck;
    readonly lineOfSightClear?: LineOfSightCheck;
  }) {
    super(opts.scene, opts.x, opts.y, 'skeleton-box');
    this.target = opts.target;
    this.isSolidAt = opts.isSolidAt;
    this.lineOfSightClear = opts.lineOfSightClear;

    this.setOrigin(0.5, 1); // bottom-centre — LedgeSensor probes from foot level
    opts.scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(BODY_W, BODY_H, false);
    body.setOffset(0, 0);
    body.setAllowGravity(true);
    body.setCollideWorldBounds(true);

    this.fsmHost = createSkeletonFsmHost();
    this.fsm = createSkeletonStateMachine(this.fsmHost, 'IDLE');

    opts.scene.add.existing(this);
    this.setDepth(Depth.ENEMY);
    this.setActive(true);
    this.setVisible(true);
  }

  get moveState(): SkeletonStateId {
    return this.fsm.id;
  }

  get facingDir(): -1 | 1 {
    return this.facingC.value;
  }

  /** The seam a `CombatSinks` adapter calls once T10 wires this enemy into `GameScene`. */
  receiveHit(damage: number, poiseDamage: number, t: number): void {
    const broke = this.poise.damage(poiseDamage, t);
    this.health.damage(damage);
    if (broke) this.pendingPoiseBroken = true;
  }

  protected override onUpdate(time: number, delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const t = now();
    const targetPos = this.target.position;

    this.syncFsmHost(targetPos, t);
    const prevId = this.fsm.id;
    this.fsm.update({ time, delta });
    this.onStateChanged(prevId, this.fsm.id, t);

    this.applyMovement(body, targetPos);
    this.hitbox.update(t);
    this.poise.update(t);
  }

  private syncFsmHost(targetPos: Readonly<Vec2> | null, t: number): void {
    const self: Vec2 = { x: this.x, y: this.y };
    this.fsmHost.seesPlayer =
      targetPos !== null &&
      this.vision.canSee(self, this.facingC.value, targetPos, this.lineOfSightClear);
    this.fsmHost.inAttackRange =
      targetPos !== null && Math.abs(targetPos.x - this.x) <= SKELETON_OVERHEAD_SWING.maxRange;
    this.fsmHost.attackOffCooldown =
      t - this.lastAttackUsedAt >= SKELETON_OVERHEAD_SWING.cooldownMs;
    this.fsmHost.hp = this.health.value;
    this.fsmHost.poiseBroken = this.pendingPoiseBroken;
    this.pendingPoiseBroken = false;

    const elapsed = this.fsm.timeInState;
    this.fsmHost.idleElapsed = elapsed >= (SKELETON_STATE_DURATION_MS.IDLE ?? Infinity);
    this.fsmHost.alertElapsed = elapsed >= (SKELETON_STATE_DURATION_MS.ALERT ?? Infinity);
    this.fsmHost.windupElapsed = elapsed >= (SKELETON_STATE_DURATION_MS.WINDUP ?? Infinity);
    this.fsmHost.activeElapsed = elapsed >= (SKELETON_STATE_DURATION_MS.ATTACK ?? Infinity);
    this.fsmHost.recoverElapsed = elapsed >= (SKELETON_STATE_DURATION_MS.RECOVER ?? Infinity);
    this.fsmHost.staggerElapsed = elapsed >= (SKELETON_STATE_DURATION_MS.HURT ?? Infinity);
  }

  /** Schedule the attack hitbox on entering WINDUP; mark cooldown used at the same moment. */
  private onStateChanged(from: SkeletonStateId, to: SkeletonStateId, t: number): void {
    if (from === to || to !== 'WINDUP') return;
    this.lastAttackUsedAt = t;
    this.hitbox.schedule(
      t,
      SKELETON_OVERHEAD_SWING.windupMs,
      SKELETON_OVERHEAD_SWING.activeMs,
      enemyHitboxSpecFor(SKELETON_OVERHEAD_SWING),
    );
  }

  /**
   * PATROL walks and reverses at ledges/walls; CHASE closes on the target; every
   * other state holds still — WINDUP/ATTACK/RECOVER are committed (docs/08 §5.2),
   * IDLE/ALERT/HURT/DEATH have no reason to move.
   */
  private applyMovement(body: Phaser.Physics.Arcade.Body, targetPos: Readonly<Vec2> | null): void {
    if (this.fsm.id === 'PATROL') {
      const sensor = this.ledge.sense(this.x, this.y, this.facingC.value, this.isSolidAt);
      const move = resolvePatrolVelocity(this.facingC.value, SKELETON_STATS.moveSpeed, sensor);
      this.facingC.set(move.facing);
      body.setVelocityX(move.vx);
      return;
    }
    if (this.fsm.id === 'CHASE' && targetPos !== null) {
      const move = resolveChaseVelocity(this.x, targetPos.x, SKELETON_STATS.chaseSpeed);
      this.facingC.set(move.facing);
      body.setVelocityX(move.vx);
      return;
    }
    body.setVelocityX(0);
  }
}

export function ensureSkeletonBoxTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists('skeleton-box')) {
    scene.textures.remove('skeleton-box');
  }
  const g = scene.make.graphics({ x: 0, y: 0 });
  g.fillStyle(0xffffff, 1);
  g.fillRect(0, 0, BODY_W, BODY_H);
  g.generateTexture('skeleton-box', BODY_W, BODY_H);
  g.destroy();
}
