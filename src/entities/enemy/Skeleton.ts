import { Depth } from '@config/Depth';
import { expand, GENEROSITY } from '@components/Box';
import { enemyHitboxSpecFor } from '@components/EnemyAttackStep';
import { Facing } from '@components/Facing';
import { Flinch } from '@components/Flinch';
import { Health } from '@components/Health';
import { Hitbox } from '@components/Hitbox';
import { HitFlash } from '@components/HitFlash';
import { Hurtbox } from '@components/Hurtbox';
import { IFrames } from '@components/IFrames';
import { Knockback } from '@components/Knockback';
import { LedgeSensor } from '@components/LedgeSensor';
import { Poise } from '@components/Poise';
import { VisionCone } from '@components/VisionCone';
import { SkeletonAnimator } from '@entities/enemy/SkeletonAnimator';
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

/** docs/07-Combat.md §5.3 — NORMATIVE Skeleton body. Offset kept 0,0 against this
 * placeholder box texture (sized exactly to the body), same deviation `FeelPlayer`
 * already takes against its own table row — the table's offset centres a smaller
 * body inside a larger real sprite frame, which doesn't exist until M3 art. */
const BODY_W = 12;
const BODY_H = 26;

/** Pull-based, like `FeelPlayer`'s `InputFrameSource` — `position` is null while no player exists. */
export interface TargetSource {
  readonly position: Readonly<Vec2> | null;
}

/**
 * Basic-tier Skeleton — docs/08-Enemy-System.md §6.1 (M2-T9). One class, numbers
 * inline, per ADR-004: extraction to the JSON `EnemyDefinition` framework (§9) is
 * M4's job, once a second enemy exists to generalise from.
 *
 * `health`/`poise`/`iFrames`/`armour`/`knockbackTaken`/`knockbackResist`/`poiseResist`/
 * `baseStaggerMs`/`centre` are the raw pieces a `CombatVictim` adapter (built in
 * `GameScene`, M2-T10) reads; `applyStagger` is the seam `CombatSinks.applyStagger`
 * calls after hit stop ends. `iFrames` is never granted — docs/07 §9.2, "Enemies
 * have none" — it exists only so this entity satisfies `CombatVictim`'s shape.
 */
export class Skeleton extends Entity {
  readonly health = new Health(SKELETON_STATS.maxHp);
  readonly poise = new Poise(SKELETON_STATS.poise, SKELETON_STATS.poiseRegenDelayMs);
  readonly iFrames = new IFrames();
  readonly flinch = new Flinch();
  readonly hitFlash = new HitFlash();
  readonly knockback = new Knockback();
  readonly hitbox = new Hitbox();
  /** Re-armed every frame in `onUpdate` — the body is a persistent contact threat,
   * not a windowed attack; the player's own i-frames throttle repeat hits (§9.1). */
  readonly contactHitbox = new Hitbox();
  readonly hurtbox = new Hurtbox(
    expand(
      { width: BODY_W, height: BODY_H, offsetX: 0, offsetY: -BODY_H / 2 },
      GENEROSITY.ENEMY_HURTBOX,
    ),
  );

  /** §6.1.1 armour 0.00; knockback/poise resist have no Skeleton-specific values in
   * the docs, defaulted neutral (1.0/0.0) — flag if a future tier varies them. */
  readonly armour = SKELETON_STATS.armour;
  readonly knockbackTaken = 1;
  readonly knockbackResist = 0;
  readonly poiseResist = 0;
  readonly baseStaggerMs = SKELETON_STATS.staggerMs;

  private readonly facingC = new Facing(1);
  private readonly vision = new VisionCone(SKELETON_SENSE);
  private readonly ledge = new LedgeSensor();
  private readonly animator: SkeletonAnimator;
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
    this.animator = new SkeletonAnimator(this);
    this.animator.update({ state: 'IDLE', facing: 1 });

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

  /** World-space centre — `CombatVictim.centre`, for knockback direction and VFX. */
  get centre(): Vec2 {
    return { x: this.x, y: this.y - BODY_H / 2 };
  }

  /**
   * `CombatSinks.applyStagger` — called after hit stop ends (docs/07 §6.7). A poise
   * break forces the FULL stagger via the FSM's universal `poiseBroken -> HURT` edge
   * (consumed on the next `syncFsmHost`); an intact poise only starts a 100ms
   * `Flinch` — the AI keeps running, matching §8.1's "flinch only, AI continues".
   */
  applyStagger(poiseBroken: boolean): void {
    if (poiseBroken) {
      this.pendingPoiseBroken = true;
    } else {
      this.flinch.start();
    }
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
    this.flinch.update(delta);
    this.hitFlash.update(delta);
    // Re-armed every frame — a persistent contact threat, not a windowed attack (§9.1).
    this.contactHitbox.schedule(t, 0, Math.max(delta, 1), {
      width: BODY_W,
      height: BODY_H,
      offsetX: 0,
      offsetY: -BODY_H / 2,
    });
    this.contactHitbox.update(t);
    this.animator.update({
      state: this.fsm.id,
      facing: this.facingC.value,
      flashColour: this.hitFlash.currentColour(),
    });
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
