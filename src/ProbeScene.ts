import Phaser from 'phaser';

// Samurai constants — docs/00-README.md §5.2–5.3 + docs/06-Characters.md §5.2
const GRAVITY_Y = 900;
const MAX_FALL = 300;
const FALL_MULT = 1.35;
const APEX_MULT = 0.7;
const APEX_THRESHOLD = 40;
const RUN_SPEED = 90;
const GROUND_ACCEL = 900;
const GROUND_DECEL = 1200;
const AIR_ACCEL = 600;
const AIR_DECEL = 400;
const TURN_BOOST = 1.8;
const JUMP_V = -240;
const JUMP_CUT = 0.45;
const COYOTE_MS = 100;
const BUFFER_MS = 120;
const DASH_SPEED = 260;
const DASH_MS = 150;
const DASH_CD_MS = 500;

const PLAYER_W = 14;
const PLAYER_H = 28;

// docs/10-Level-Design.md §5.2–5.3
const HOP = 24;
const GAP_S = 32;
const GAP_M = 40;
const GAP_L = 56;
const GAP_XL = 64;
const LEDGE_M = 24;
const LEDGE_L = 26;
const LEDGE_XL = 40;

function approach(current: number, target: number, maxDelta: number): number {
  if (current < target) return Math.min(current + maxDelta, target);
  if (current > target) return Math.max(current - maxDelta, target);
  return target;
}

type MoveState = 'IDLE' | 'RUN' | 'JUMP' | 'FALL' | 'DASH';

interface JumpRecord {
  height: number;
  coyote: boolean;
  cut: boolean;
}

export class ProbeScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private body!: Phaser.Physics.Arcade.Body;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private hud!: Phaser.GameObjects.Text;
  private labels: Phaser.GameObjects.Text[] = [];

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;
  private keyShift!: Phaser.Input.Keyboard.Key;
  private keyJ!: Phaser.Input.Keyboard.Key;
  private keyK!: Phaser.Input.Keyboard.Key;

  private facing: -1 | 1 = 1;
  private jumpCutApplied = false;
  private coyoteExpiresAt = 0;
  private jumpPressedAt = -Infinity;
  private wasGrounded = false;
  private dashEndsAt = 0;
  private dashCdEndsAt = 0;
  private dashDir: -1 | 1 = 1;
  private airDashUsed = false;
  private jumpOriginY = 0;
  private jumpPeakY = 0;
  private trackingJump = false;
  private lastJumpCoyote = false;
  private lastJumpCut = false;
  private jumpHeights: JumpRecord[] = [];
  private moveState: MoveState = 'IDLE';
  private jumpedThisAirborne = false;
  /** Authoritative vertical velocity. Body gets the midpoint so Phaser's
   *  `y += v*dt` step matches continuous `y += v*dt + ½g·dt²` (docs §5.2 → 32 px). */
  private trueVy = 0;

  constructor() {
    super('ProbeScene');
  }

  create(): void {
    this.platforms = this.physics.add.staticGroup();
    this.buildMeasureLevel();

    this.player = this.add.rectangle(40, 120, PLAYER_W, PLAYER_H, 0x9aa0a6);
    this.physics.add.existing(this.player);
    this.body = this.player.body as Phaser.Physics.Arcade.Body;
    this.body.setCollideWorldBounds(false);
    this.body.setMaxVelocity(Infinity, MAX_FALL);
    this.body.setSize(PLAYER_W, PLAYER_H);
    // Disable world gravity; we apply asymmetric gravity manually (docs/06 §5.1).
    this.body.setAllowGravity(false);

    this.physics.add.collider(this.player, this.platforms);

    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keyA = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keySpace = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyShift = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.keyJ = kb.addKey(Phaser.Input.Keyboard.KeyCodes.J);
    this.keyK = kb.addKey(Phaser.Input.Keyboard.KeyCodes.K);

    this.hud = this.add
      .text(4, 4, '', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#e8e6f0',
        backgroundColor: '#000000aa',
        padding: { x: 2, y: 2 },
      })
      .setScrollFactor(0)
      .setDepth(100);

    this.cameras.main.setBounds(0, 0, 920, 220);
    this.physics.world.setBounds(0, 0, 920, 260);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
  }

  private platform(x: number, y: number, w: number, h: number, color = 0x3a3650): Phaser.GameObjects.Rectangle {
    const r = this.add.rectangle(x + w / 2, y + h / 2, w, h, color);
    this.physics.add.existing(r, true);
    const b = r.body as Phaser.Physics.Arcade.StaticBody;
    b.setSize(w, h);
    b.updateFromGameObject();
    this.platforms.add(r);
    return r;
  }

  private label(x: number, y: number, text: string): void {
    this.labels.push(
      this.add
        .text(x, y, text, {
          fontFamily: 'monospace',
          fontSize: '7px',
          color: '#c8c4d8',
        })
        .setOrigin(0, 1),
    );
  }

  /** Static rectangles at exact vocabulary widths — docs/10 §5.2–5.3 */
  private buildMeasureLevel(): void {
    const floorY = 160;
    const softY = floorY + 32;
    let x = 0;

    // Start pad
    this.platform(x, floorY, 64, 20);
    this.label(x + 4, floorY - 2, 'START');
    x += 64;

    // HOP 24
    this.platform(x + HOP, floorY, 48, 20);
    this.label(x, floorY - 2, `HOP ${HOP}`);
    this.platform(x, softY, HOP + 48, 8, 0x2a2840); // soft floor
    x += HOP + 48;

    // GAP_S 32
    this.platform(x + GAP_S, floorY, 48, 20);
    this.label(x, floorY - 2, `GAP_S ${GAP_S}`);
    this.platform(x, softY, GAP_S + 48, 8, 0x2a2840);
    x += GAP_S + 48;

    // GAP_M 40 — critical workhorse
    this.platform(x + GAP_M, floorY, 56, 20);
    this.label(x, floorY - 2, `GAP_M ${GAP_M} ★`);
    this.platform(x, softY, GAP_M + 56, 8, 0x2a2840);
    x += GAP_M + 56;

    // GAP_L 56 — needs dash
    this.platform(x + GAP_L, floorY, 56, 20);
    this.label(x, floorY - 2, `GAP_L ${GAP_L}`);
    this.platform(x, softY, GAP_L + 56, 8, 0x2a2840);
    x += GAP_L + 56;

    // GAP_XL 64 — needs dash, tight
    this.platform(x + GAP_XL, floorY, 64, 20);
    this.label(x, floorY - 2, `GAP_XL ${GAP_XL}`);
    this.platform(x, softY, GAP_XL + 64, 8, 0x2a2840);
    x += GAP_XL + 64;

    // Landing pad before ledges
    this.platform(x, floorY, 96, 20);
    this.label(x + 4, floorY - 2, 'LEDGES');
    const ledgeBase = x;
    x += 96;

    // LEDGE_M 24 — single jump from floor
    this.platform(ledgeBase + 8, floorY - LEDGE_M, 40, 8, 0x4a4660);
    this.label(ledgeBase + 8, floorY - LEDGE_M - 2, `LEDGE_M ${LEDGE_M}`);

    // LEDGE_L 26 — tallest single-jump main-path ledge
    this.platform(ledgeBase + 52, floorY - LEDGE_L, 40, 8, 0x4a4660);
    this.label(ledgeBase + 52, floorY - LEDGE_L - 2, `LEDGE_L ${LEDGE_L}`);

    // LEDGE_XL 40 — cannot single-jump (peak ≈ 32). Two-stage: mid @ 20, then XL @ 40.
    // Mid sits under XL with a small step-across so you land, then jump up.
    const xlX = ledgeBase + 100;
    this.platform(xlX, floorY - 20, 40, 8, 0x5a5670); // mid step (20 px)
    this.label(xlX, floorY - 22, 'mid 20');
    this.platform(xlX + 28, floorY - LEDGE_XL, 48, 8, 0x4a4660); // width 48, height 40
    this.label(xlX + 28, floorY - LEDGE_XL - 2, `LEDGE_XL ${LEDGE_XL} (2-stage)`);

    // End wall so you don't fall forever sideways
    this.platform(x + 60, floorY - 80, 16, 100, 0x3a3650);
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(delta, 33.34) / 1000;
    const now = this.time.now;
    const grounded = this.body.blocked.down || this.body.touching.down;

    this.handleGroundTransitions(grounded, now);
    this.pollJumpBuffer(now);
    this.tryDash(now);
    this.applyDashOrMove(dt, now, grounded);
    // Gravity before jump so JUMP_V is not reduced on the takeoff frame
    // (keeps measured peak near the §5.2 derivation of 32 px).
    this.applyGravity(dt, now);
    this.tryConsumeJump(now, grounded);
    this.applyJumpCut();
    this.trackJumpHeight(grounded);
    this.updateMoveState(grounded, now);
    this.updateHud(now, grounded);

    // Soft respawn if you fall out
    if (this.player.y > 240) {
      this.player.setPosition(40, 120);
      this.body.setVelocity(0, 0);
      this.trueVy = 0;
    }
  }

  private handleGroundTransitions(grounded: boolean, now: number): void {
    if (grounded) {
      this.airDashUsed = false;
      this.jumpedThisAirborne = false;
      if (!this.wasGrounded) {
        // re-grounding clears coyote
        this.coyoteExpiresAt = 0;
      }
    } else if (this.wasGrounded) {
      // left ground without jumping — open coyote window (absolute expiry)
      if (!this.jumpedThisAirborne) {
        this.coyoteExpiresAt = now + COYOTE_MS;
      }
    }
    this.wasGrounded = grounded;
  }

  private pollJumpBuffer(now: number): void {
    const pressed =
      Phaser.Input.Keyboard.JustDown(this.keySpace) ||
      Phaser.Input.Keyboard.JustDown(this.keyJ) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.up!);
    if (pressed) this.jumpPressedAt = now;
  }

  private tryDash(now: number): void {
    if (now < this.dashEndsAt) return;
    const wants =
      Phaser.Input.Keyboard.JustDown(this.keyShift) ||
      Phaser.Input.Keyboard.JustDown(this.keyK);
    if (!wants) return;
    if (now < this.dashCdEndsAt) return;

    const grounded = this.body.blocked.down || this.body.touching.down;
    if (!grounded && this.airDashUsed) return;

    const moveX = this.moveAxis();
    this.dashDir = moveX !== 0 ? (moveX as -1 | 1) : this.facing;
    this.facing = this.dashDir;
    this.dashEndsAt = now + DASH_MS;
    this.dashCdEndsAt = now + DASH_CD_MS; // cooldown from START
    this.coyoteExpiresAt = 0; // dash clears coyote
    if (!grounded) this.airDashUsed = true;
  }

  private moveAxis(): number {
    let x = 0;
    if (this.cursors.left!.isDown || this.keyA.isDown) x -= 1;
    if (this.cursors.right!.isDown || this.keyD.isDown) x += 1;
    return x;
  }

  private applyDashOrMove(dt: number, now: number, grounded: boolean): void {
    if (now < this.dashEndsAt) {
      this.trueVy = 0;
      this.body.setVelocity(this.dashDir * DASH_SPEED, 0);
      return;
    }

    const wants = this.moveAxis();
    const v = this.body.velocity.x;

    if (wants === 0) {
      const decel = grounded ? GROUND_DECEL : AIR_DECEL;
      this.body.setVelocityX(approach(v, 0, decel * dt));
      return;
    }

    this.facing = wants as -1 | 1;
    const opposing = Math.sign(v) !== 0 && Math.sign(v) !== wants;
    const baseAccel = grounded ? GROUND_ACCEL : AIR_ACCEL;
    const accel = opposing ? baseAccel * TURN_BOOST : baseAccel;
    this.body.setVelocityX(approach(v, wants * RUN_SPEED, accel * dt));
  }

  private tryConsumeJump(now: number, grounded: boolean): void {
    if (now < this.dashEndsAt) return; // jump buffered during dash; resolve after
    const buffered = now - this.jumpPressedAt <= BUFFER_MS;
    if (!buffered) return;

    const inCoyote = now < this.coyoteExpiresAt;
    if (!grounded && !inCoyote) {
      // consume buffer even on none (docs/06 §5.3)
      this.jumpPressedAt = -Infinity;
      return;
    }

    const usedCoyote = !grounded && inCoyote;
    this.trueVy = JUMP_V;
    this.body.setVelocityY(JUMP_V);
    this.jumpCutApplied = false;
    this.coyoteExpiresAt = 0;
    this.jumpPressedAt = -Infinity;
    this.jumpedThisAirborne = true;
    this.jumpOriginY = this.player.y;
    this.jumpPeakY = this.player.y;
    this.trackingJump = true;
    this.lastJumpCoyote = usedCoyote;
    this.lastJumpCut = false;
  }

  private applyJumpCut(): void {
    const jumpHeld =
      this.keySpace.isDown || this.keyJ.isDown || this.cursors.up!.isDown;
    if (!jumpHeld && this.trueVy < 0 && !this.jumpCutApplied) {
      this.trueVy *= JUMP_CUT;
      this.body.setVelocityY(this.trueVy);
      this.jumpCutApplied = true;
      this.lastJumpCut = true;
    }
  }

  private applyGravity(dt: number, now: number): void {
    if (now < this.dashEndsAt) return; // gravity suspended during dash

    const grounded = this.body.blocked.down || this.body.touching.down;
    if (grounded) {
      this.trueVy = 0;
      if (this.body.velocity.y > 0) this.body.setVelocityY(0);
      return;
    }

    if (this.body.blocked.up) {
      this.trueVy = Math.max(0, this.trueVy);
    }

    let g = GRAVITY_Y;
    if (this.trueVy > 0) g *= FALL_MULT;
    else if (Math.abs(this.trueVy) < APEX_THRESHOLD) g *= APEX_MULT;

    const old = this.trueVy;
    this.trueVy = Math.min(old + g * dt, MAX_FALL);
    // Midpoint velocity → Phaser's y+=v·dt matches continuous y+=v·dt+½g·dt²
    this.body.setVelocityY((old + this.trueVy) / 2);
  }

  private trackJumpHeight(grounded: boolean): void {
    if (!this.trackingJump) return;
    if (this.player.y < this.jumpPeakY) this.jumpPeakY = this.player.y;

    const risingOrHang = this.trueVy <= 0;
    if (!risingOrHang || grounded) {
      const height = this.jumpOriginY - this.jumpPeakY;
      this.jumpHeights.unshift({
        height,
        coyote: this.lastJumpCoyote,
        cut: this.lastJumpCut,
      });
      if (this.jumpHeights.length > 5) this.jumpHeights.pop();
      this.trackingJump = false;
    }
  }

  private updateMoveState(grounded: boolean, now: number): void {
    if (now < this.dashEndsAt) {
      this.moveState = 'DASH';
      return;
    }
    if (!grounded) {
      this.moveState = this.trueVy < 0 ? 'JUMP' : 'FALL';
      return;
    }
    this.moveState = Math.abs(this.body.velocity.x) > 5 ? 'RUN' : 'IDLE';
  }

  private updateHud(now: number, grounded: boolean): void {
    const coyote =
      now < this.coyoteExpiresAt
        ? `active ${Math.max(0, this.coyoteExpiresAt - now).toFixed(0)}ms`
        : 'expired';
    const buffer =
      now - this.jumpPressedAt <= BUFFER_MS
        ? `armed ${Math.max(0, BUFFER_MS - (now - this.jumpPressedAt)).toFixed(0)}ms`
        : 'idle';
    const dashReady = now >= this.dashCdEndsAt;
    const dashCd = Math.max(0, this.dashCdEndsAt - now);
    const dash =
      now < this.dashEndsAt
        ? `active ${Math.max(0, this.dashEndsAt - now).toFixed(0)}ms`
        : dashReady
          ? 'ready (cd 0ms)'
          : `ready (cd ${dashCd.toFixed(0)}ms)`;

    const last = this.jumpHeights[0];
    const lastLine = last
      ? `last jump: coyote=${last.coyote}  cut=${last.cut}  height=${last.height.toFixed(1)}px`
      : 'last jump: —';
    const peaks = this.jumpHeights.map((j) => j.height.toFixed(1)).join(', ') || '—';

    this.hud.setText(
      [
        `vx ${this.body.velocity.x.toFixed(1).padStart(7)}   vy ${this.trueVy.toFixed(1).padStart(7)}`,
        `state  ${this.moveState.padEnd(6)}  grounded  ${grounded}`,
        `coyote  ${coyote}   buffer   ${buffer}`,
        `dash  ${dash}`,
        lastLine,
        `peaks (hold≈32): ${peaks}`,
        `keys: Arrows/AD move · Space/J jump · Shift/K dash`,
      ].join('\n'),
    );
  }
}
