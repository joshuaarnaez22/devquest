import { Depth } from '@config/Depth';
import { FEEL } from '@config/GameConstants';
import { expand, GENEROSITY } from '@components/Box';
import { Health } from '@components/Health';
import { Hitbox } from '@components/Hitbox';
import { Hurtbox } from '@components/Hurtbox';
import { Knockback } from '@components/Knockback';
import { Poise } from '@components/Poise';
import { Entity } from '@entities/Entity';
import { createAbilityFor } from '@entities/player/abilities/AbilityForHero';
import { AttackScheduler } from '@entities/player/AttackScheduler';
import { SAMURAI_COMBO } from '@entities/player/CharacterCombat';
import { SAMURAI_MOVEMENT } from '@entities/player/CharacterMovement';
import { FrozenInputLatch } from '@entities/player/FrozenInputLatch';
import { PlayerAbilitySlot } from '@entities/player/PlayerAbilitySlot';
import { PlayerAnimator } from '@entities/player/PlayerAnimator';
import { updateAttack } from '@entities/player/PlayerAttackStep';
import { PlayerController, WALL_JUMP_PUSH } from '@entities/player/PlayerController';
import { PlayerDamage } from '@entities/player/PlayerDamage';
import { createJumpState, onLanded, resolveJump } from '@entities/player/PlayerJump';
import {
  createPlayerFsmHost,
  createPlayerStateMachine,
  PLAYER_STATE_DURATION_MS,
  tickPlayerFsm,
} from '@entities/player/PlayerStates';
import { SquashStretch } from '@entities/ProceduralAnim';
import { now } from '@platform/Clock';
import type { AttackStep } from '@components/AttackStep';
import type { EventBus } from '@core/EventBus';
import type { GameEventMap, Vec2 } from '@core/GameEvents';
import type { InputFrame, InputFrameSource } from '@core/InputFrame';
import type { StateMachine } from '@core/StateMachine';
import type { CharacterContent, CharacterId } from '@data/CharacterTypes';
import type { CharacterMovement } from '@entities/player/CharacterMovement';
import type { JumpDeps, PlayerJumpState } from '@entities/player/PlayerJump';
import type { PlayerStateId } from '@entities/player/PlayerStateId';
import type { PlayerFsmHost } from '@entities/player/PlayerStates';
import type Phaser from 'phaser';

const BODY_W = 14;
const BODY_H = 28;

/** Player poise regen delay has no documented value (docs/07 §8.2's table is enemies
 * only) — chosen to match the Skeleton's, flag if a real value surfaces (M2-T13). */
const PLAYER_POISE_REGEN_MS = 1500;

/**
 * Downward speed left on the body while grounded so the next Arcade step still
 * reports `blocked.down`. Custom gravity uses `allowGravity: false`; with vy=0,
 * floor contact flickers and jumps miss.
 *
 * Arcade `world.update` runs on Scene UPDATE (before Scene.update). Stick is
 * applied in {@link syncAfterPhysics} so it survives until that next step.
 */
const GROUND_STICK = 24;

function senseWallDir(body: Phaser.Physics.Arcade.Body): -1 | 0 | 1 {
  if (body.blocked.left || body.touching.left) return -1;
  if (body.blocked.right || body.touching.right) return 1;
  return 0;
}

export class FeelPlayer extends Entity {
  readonly controller: PlayerController;
  /** Rebuilt in `setCharacter` — `maxHp`/`poise` vary per hero (docs/06 §7). */
  health = new Health(100);
  poise = new Poise(20, PLAYER_POISE_REGEN_MS);
  readonly knockback = new Knockback();
  readonly hurtbox = new Hurtbox(
    expand(
      { width: BODY_W, height: BODY_H, offsetX: 0, offsetY: -BODY_H / 2 },
      GENEROSITY.PLAYER_HURTBOX,
    ),
  );
  /** §7.1/§6.4 — always 0 for the player, per `CombatVictim`'s own field comments,
   * except while Guard is actively blocking — `KnightGuard` mutates this directly. */
  readonly armour = 0;
  knockbackResist = 0;
  readonly poiseResist = 0;
  readonly baseStaggerMs = PLAYER_STATE_DURATION_MS.HURT ?? 300;
  grounded = false;
  coyoteActive = false;
  bufferActive = false;
  dashCooldownRemainingMs = 0;
  characterId: CharacterId = 'samurai';
  displayName = 'Samurai';

  private readonly frames: InputFrameSource;
  private readonly bus: EventBus<GameEventMap>;
  private readonly fsmHost: PlayerFsmHost;
  private readonly fsm: StateMachine<PlayerFsmHost, PlayerStateId>;
  private readonly animator: PlayerAnimator;
  private readonly squash: SquashStretch;
  /**
   * Attack scheduling (M2-T4). In M2 every hero swings the Samurai Blade Chain —
   * per-hero combos are authored later — so combat feel is tuned on the reference.
   */
  private readonly attack = new AttackScheduler();
  readonly attackHitbox = new Hitbox();
  /** Attack/dash/special presses that land while frozen by hit stop (M2-T6, §6.2 P3). */
  private readonly frozenInput = new FrozenInputLatch();
  private movement: CharacterMovement = SAMURAI_MOVEMENT;
  /** `CombatVictim.knockbackTaken` — varies per hero (docs/06 §7). */
  knockbackTaken = 1;
  private animPrefix = 'samurai';
  private facing: -1 | 1 = 1;
  /** Jump/land reaction state — split into `PlayerJump.ts` (M2-T10, file-length budget). */
  readonly jumpState: PlayerJumpState;
  private wallDir: -1 | 0 | 1 = 0;
  /** i-frames, hit-flash, and the damage bus event — split out (M2-T10) to keep this file
   * under budget. Public: `CombatVictim`/`CombatSinks` adapters read `.iFrames`/`.hitFlash`. */
  readonly damage: PlayerDamage;
  /** Hero-ability integration (M2-T11) — public: `GameCombatWiring`'s `CombatVictim`
   * adapter calls `.interceptDamage`, abilities reach it via `ctx.player.abilitySlot`. */
  readonly abilitySlot: PlayerAbilitySlot;
  private readonly respawnPoint: Vec2;

  constructor(opts: {
    readonly scene: Phaser.Scene;
    readonly x: number;
    readonly y: number;
    readonly frames: InputFrameSource;
    readonly bus: EventBus<GameEventMap>;
  }) {
    super(opts.scene, opts.x, opts.y, 'player-box');
    this.frames = opts.frames;
    this.bus = opts.bus;
    this.damage = new PlayerDamage(opts.bus, this.id);
    this.abilitySlot = new PlayerAbilitySlot(this, opts.bus);
    this.jumpState = createJumpState(SAMURAI_MOVEMENT.airJumps);
    this.respawnPoint = { x: opts.x, y: opts.y };
    // Bottom-centre — squash must not lift feet (docs/14 §8.1).
    this.setOrigin(0.5, 1);
    opts.scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(BODY_W, BODY_H, false);
    body.setOffset(0, 0);
    body.setCollideWorldBounds(true);
    body.setAllowGravity(false);
    this.controller = new PlayerController(body, this.movement);
    this.applyMaxVelocity(body);
    this.fsmHost = createPlayerFsmHost();
    this.fsm = createPlayerStateMachine(this.fsmHost, 'IDLE');
    this.animator = new PlayerAnimator(this);
    this.squash = new SquashStretch(this);
    this.animator.update({ state: 'IDLE', facing: 1, animPrefix: this.animPrefix });
    opts.scene.add.existing(this);
    this.setDepth(Depth.PLAYER);
    this.setActive(true);
    this.setVisible(true);
  }

  /** World-space centre — `CombatVictim.centre`. */
  get centre(): Vec2 {
    return { x: this.x, y: this.y - BODY_H / 2 };
  }

  /** Hot-swap hero from ContentDatabase (F1–F4). */
  setCharacter(content: CharacterContent): void {
    this.characterId = content.id;
    this.displayName = content.displayName;
    this.animPrefix = content.animPrefix;
    this.movement = content.movement;
    this.controller.setMovement(content.movement);
    this.jumpState.airJumpsRemaining = content.movement.airJumps;
    this.jumpState.airDashAvailable = true;
    this.controller.refreshDashCooldown();
    this.health = new Health(content.defensive.maxHp);
    this.poise = new Poise(content.defensive.poise, PLAYER_POISE_REGEN_MS);
    this.knockbackTaken = content.defensive.knockbackTaken;
    this.abilitySlot.sync(this.frames.frame, now(), 0);
    this.abilitySlot.setAbility(createAbilityFor(content.id));
    const body = this.body as Phaser.Physics.Arcade.Body;
    this.applyMaxVelocity(body);
    this.animator.update({
      state: this.fsm.id,
      facing: this.facing,
      animPrefix: this.animPrefix,
      flashColour: this.damage.flashColour,
    });
  }

  /** See `PlayerDamage.applyDamage` — must stay synchronous (docs/07 §9.3). */
  applyDamage(t: number): void {
    this.damage.applyDamage(t, this.health.value);
  }

  private respawn(t: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    this.health.reset();
    this.poise.reset();
    body.reset(this.respawnPoint.x, this.respawnPoint.y);
    this.controller.setVerticalVelocity(0);
    this.damage.grantRespawnIFrames(t);
    this.grounded = true;
    this.jumpState.originY = null;
    this.jumpState.airJumpsRemaining = this.movement.airJumps;
    this.jumpState.airDashAvailable = true;
    this.jumpState.coyoteExpiresAt = 0;
    this.controller.refreshDashCooldown();
    this.fsm.force('IDLE', { time: t, delta: 0 });
  }

  private applyMaxVelocity(body: Phaser.Physics.Arcade.Body): void {
    const maxVx = Math.max(this.movement.dashSpeed, WALL_JUMP_PUSH, this.movement.runSpeed * 1.5);
    body.setMaxVelocity(maxVx, 400);
  }

  /** Ninja's Shadow Step (docs/06 §7.3.4) — "restores air jump and dash cooldown". */
  restoreAirMobility(): void {
    this.jumpState.airJumpsRemaining = this.movement.airJumps;
    this.jumpState.airDashAvailable = true;
    this.controller.refreshDashCooldown();
  }

  private jumpDeps(): JumpDeps {
    return {
      controller: this.controller,
      bus: this.bus,
      squash: this.squash,
      maxAirJumps: this.movement.airJumps,
    };
  }

  /** Current FSM id — docs/06 §6. */
  get moveState(): PlayerStateId {
    return this.fsm.id;
  }

  get facingDir(): -1 | 1 {
    return this.facing;
  }

  /** The `AttackStep` the current attack-hitbox activation belongs to, or `null`. */
  get currentAttackStep(): AttackStep | null {
    return this.attack.current;
  }

  get runSpeed(): number {
    return this.movement.runSpeed;
  }

  /** Horizontal body velocity for camera look-ahead. */
  get velocityX(): number {
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    return body?.velocity.x ?? 0;
  }

  /** While frozen, `onUpdate` never runs — latch the raw press so it is not lost. */
  protected override onFrozenTick(): void {
    this.frozenInput.captureWhileFrozen(this.frames.frame);
  }

  /**
   * Pre-display tick (after Arcade this frame): dash, jump, move, gravity.
   * Call {@link syncAfterPhysics} on Scene POST_UPDATE afterward.
   */
  protected override onUpdate(_time: number, delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const frame = this.frames.frame;
    const t = now();
    this.jumpState.kind = null;
    this.wallDir = senseWallDir(body);
    this.abilitySlot.sync(frame, t, delta);

    this.controller.beginFrame(delta);

    if (frame.moveX !== 0 && !this.controller.isWallJumpLocked(t)) {
      this.facing = frame.moveX;
    }

    // SPECIAL is uninterruptible by dash/jump in M2 — only `damaged` breaks it
    // (per the FSM's own SPECIAL transition); per-ability cancel windows (§9.4)
    // are a tuning-pass nuance, not built until feel testing asks for one.
    if (this.moveState === 'SPECIAL') {
      this.abilitySlot.tickActive();
    } else {
      // Dash outranks jump (docs/06 §6.3); jump during dash stays buffered.
      if (!this.controller.isDashing) {
        this.resolveDash(frame, t);
      }

      this.controller.tickDash(t);
      if (this.controller.isDashing) {
        // Velocity locked inside tickDash; no gravity / horizontal / jump.
      } else {
        const outcome = resolveJump(this.jumpState, this.jumpDeps(), {
          frame,
          t,
          x: this.x,
          y: body.y,
          grounded: this.grounded,
          wallDir: this.wallDir,
          moveState: this.moveState,
        });
        if (outcome.setGroundedFalse) this.grounded = false;
        if (!this.controller.isWallJumpLocked(t)) {
          this.controller.applyHorizontal(frame, this.moveState, this.grounded);
        }
        this.applyVerticalMotion(frame);
      }
    }
    this.abilitySlot.tickPassive();

    this.coyoteActive = !this.grounded && t < this.jumpState.coyoteExpiresAt;
    this.bufferActive = this.isBufferActive(frame, t);
    this.dashCooldownRemainingMs = this.controller.dashCooldownRemainingMs(t);
    this.squash.tick(delta, this.grounded, this.controller.verticalVelocity);

    this.damage.tick(delta);
    this.setAlpha(this.damage.flickerAlpha(t));
  }

  private applyVerticalMotion(frame: InputFrame): void {
    if (this.grounded) return;
    if (this.moveState === 'WALL_SLIDE') {
      this.controller.applyWallSlide();
      if (this.wallDir !== 0) {
        this.facing = this.wallDir === -1 ? 1 : -1;
      }
      return;
    }
    this.controller.applyJumpCut(frame);
    this.controller.applyGravity();
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.jumpState.originY !== null) {
      const height = this.jumpState.originY - body.y;
      if (height > this.jumpState.lastHeight) {
        this.jumpState.lastHeight = height;
      }
    }
  }

  private resolveDash(frame: InputFrame, t: number): void {
    const result = this.controller.tryDash(frame, {
      now: t,
      facing: this.facing,
      grounded: this.grounded,
      airDashAvailable: this.jumpState.airDashAvailable,
    });
    if (result.kind !== 'started') return;

    this.jumpState.coyoteExpiresAt = 0;
    if (!this.grounded) {
      this.jumpState.airDashAvailable = false;
    }
    this.bus.emit('player:dashed', {
      x: this.x,
      y: this.y,
      flipX: this.facing === -1,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
      textureKey: this.texture.key,
    });
  }

  /**
   * After Scene.update: refresh grounded from this frame's collision, then leave
   * ground-stick velocity for the next Arcade UPDATE.
   */
  syncAfterPhysics(time = 0, delta = 0): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const t = now();
    const frame = this.frames.frame;
    this.wallDir = senseWallDir(body);
    this.abilitySlot.sync(frame, t, delta);

    this.refreshGrounded(body, t);
    this.syncFsmHost(frame, t);
    const prevId = this.fsm.id;
    tickPlayerFsm(this.fsm, { time, delta });
    updateAttack(this.attack, this.attackHitbox, { fsmId: this.fsm.id, prevId }, t);
    this.handleSpecialTransition(prevId);
    this.handleDeathTransition(prevId, t);
    if (this.fsm.id !== 'DASH') {
      this.controller.clearDashFinished();
    }
    this.animator.update({
      state: this.fsm.id,
      facing: this.facing,
      animPrefix: this.animPrefix,
      flashColour: this.damage.flashColour,
    });
    this.jumpState.kind = null;
  }

  private handleSpecialTransition(prevId: PlayerStateId): void {
    if (prevId !== 'SPECIAL' && this.fsm.id === 'SPECIAL') {
      this.abilitySlot.onEnter();
    } else if (prevId === 'SPECIAL' && this.fsm.id !== 'SPECIAL') {
      this.abilitySlot.onExit(this.fsmHost.damaged ? 'damaged' : 'complete');
    }
  }

  private handleDeathTransition(prevId: PlayerStateId, t: number): void {
    if (prevId !== 'DEATH' && this.fsm.id === 'DEATH') {
      this.bus.emit('combat:playerDied', { atCheckpoint: null }); // checkpoints are M3
    } else if (
      this.fsm.id === 'DEATH' &&
      this.fsm.timeInState >= (PLAYER_STATE_DURATION_MS.DEATH ?? 0)
    ) {
      this.respawn(t);
    }
  }

  private refreshGrounded(body: Phaser.Physics.Arcade.Body, t: number): void {
    const wasGrounded = this.grounded;
    const rising = this.controller.verticalVelocity < 0;
    const onFloor = body.blocked.down || body.touching.down;
    this.grounded = !rising && onFloor;

    if (this.grounded && !wasGrounded) {
      const outcome = onLanded(this.jumpState, this.jumpDeps(), {
        frame: this.frames.frame,
        x: this.x,
        y: body.y,
        t,
      });
      if (outcome.setGroundedFalse) this.grounded = false;
    } else if (!this.grounded && wasGrounded && !rising) {
      this.jumpState.originY = body.y;
      this.jumpState.coyoteExpiresAt = t + FEEL.COYOTE_TIME;
    }

    if (!this.grounded) return;
    this.jumpState.airJumpsRemaining = this.movement.airJumps;
    this.jumpState.airDashAvailable = true;
    // Keep stick during ground dash — vy=0 drops Arcade floor flags, then a
    // false re-land was calling refreshDashCooldown and wiping the remaining CD.
    this.controller.armGroundStick(GROUND_STICK);
  }

  private syncFsmHost(frame: InputFrame, t: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const locked = this.controller.isWallJumpLocked(t);
    const onWall = !this.grounded && this.wallDir !== 0 && !this.controller.isDashing;
    const inputToWall = onWall && !locked && frame.moveX === this.wallDir && this.wallDir !== 0;

    this.fsmHost.grounded = this.grounded;
    this.fsmHost.moveX = frame.moveX;
    this.fsmHost.absVx = Math.abs(body.velocity.x);
    this.fsmHost.vy = this.controller.verticalVelocity;
    this.fsmHost.airJumpsRemaining = this.jumpState.airJumpsRemaining;
    this.fsmHost.withinCoyote = !this.grounded && t < this.jumpState.coyoteExpiresAt;
    this.fsmHost.onWall = onWall;
    this.fsmHost.inputToWall = inputToWall;
    this.fsmHost.jumpKind = this.jumpState.kind;
    this.fsmHost.bufferedJump = this.jumpState.kind === 'ground' || this.isBufferActive(frame, t);
    // Input buffered during hit stop, never dropped (docs/07 §6.2, P3) — a press that
    // landed on a frozen frame (captured via onFrozenTick) is honored here exactly
    // once, on the first real frame after release.
    const buffered = this.frozenInput.applyAndClear({
      attack: frame.attackPressed,
      dash: frame.dashPressed,
      special: frame.specialPressed,
    });
    this.fsmHost.wantsDash = buffered.dash;
    this.fsmHost.wantsAttack = buffered.attack;
    this.fsmHost.wantsSpecial = buffered.special;
    this.fsmHost.downHeld = frame.moveY > 0;
    this.fsmHost.dashing = this.controller.isDashing;
    this.fsmHost.dashReady =
      this.controller.isDashCooldownReady(t) && (this.grounded || this.jumpState.airDashAvailable);
    this.fsmHost.dashFinished = this.controller.dashFinished;
    this.fsmHost.wallJumpLockExpired = this.controller.isWallJumpLockExpired(t);
    // Attack timing (M2-T4). Idle scheduler reports both false, so non-attack
    // states — which ignore these — are unaffected.
    this.fsmHost.comboWindowOpen = this.attack.comboWindowOpen(t);
    this.fsmHost.animComplete =
      this.fsm.id === 'SPECIAL' ? this.abilitySlot.isComplete : this.attack.animComplete(t);
    this.fsmHost.comboLength = SAMURAI_COMBO.length;
    // Ability (M2-T11).
    this.fsmHost.specialReady = this.abilitySlot.specialReady;
    // Damage/death (M2-T10).
    this.fsmHost.hp = this.health.value;
    this.fsmHost.damaged = this.damage.consumeDamaged();
    this.fsmHost.hurtElapsed = this.fsm.timeInState >= (PLAYER_STATE_DURATION_MS.HURT ?? 300);
  }

  private isBufferActive(frame: InputFrame, t: number): boolean {
    return (
      frame.jumpPressedAt > 0 &&
      t - frame.jumpPressedAt <= FEEL.JUMP_BUFFER &&
      !frame.jumpPressed &&
      this.controller.hasUnconsumedJumpBuffer(frame.jumpPressedAt)
    );
  }
}
