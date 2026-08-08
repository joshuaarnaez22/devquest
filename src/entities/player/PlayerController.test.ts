import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FEEL } from '@config/GameConstants';
import { HEIGHT } from '@config/LevelMetrics';
import { Rng } from '@core/Rng';
import { SAMURAI_MOVEMENT } from '@entities/player/CharacterMovement';
import {
  PlayerController,
  TURN_BOOST,
  WALL_JUMP_LOCK_MS,
  WALL_JUMP_PUSH,
} from '@entities/player/PlayerController';
import type { InputFrame } from '@core/InputFrame';

function moveFrame(moveX: -1 | 0 | 1): InputFrame {
  return Object.freeze({
    moveX,
    moveY: 0,
    jumpPressed: false,
    jumpHeld: false,
    jumpReleased: false,
    attackPressed: false,
    attackHeld: false,
    dashPressed: false,
    specialPressed: false,
    specialHeld: false,
    specialReleased: false,
    pausePressed: false,
    jumpPressedAt: 0,
    device: 'keyboard' as const,
    gamepadKind: null,
  });
}

function makeController(vx = 0): {
  body: { velocity: { x: number; y: number } };
  ctrl: PlayerController;
} {
  const body = { velocity: { x: vx, y: 0 } };
  return { body, ctrl: new PlayerController(body, SAMURAI_MOVEMENT) };
}

describe('PlayerController horizontal', () => {
  it('reaches max speed in derived time (90 px/s at 900 px/s² = 100 ms)', () => {
    const { body, ctrl } = makeController(0);
    const frameMs = 100 / 6;
    for (let i = 0; i < 6; i++) {
      ctrl.beginFrame(frameMs);
      ctrl.applyHorizontal(moveFrame(1), 'RUN', true);
    }
    expect(body.velocity.x).toBeCloseTo(SAMURAI_MOVEMENT.runSpeed, 5);
  });

  it('is still below max before 100 ms of accel', () => {
    const { body, ctrl } = makeController(0);
    ctrl.beginFrame(90);
    ctrl.applyHorizontal(moveFrame(1), 'RUN', true);
    expect(body.velocity.x).toBeCloseTo(900 * 0.09, 5);
    expect(body.velocity.x).toBeLessThan(SAMURAI_MOVEMENT.runSpeed);
  });

  it('turn-around under 1.8× boost is snappier than a standing start step', () => {
    const standing = makeController(0);
    standing.ctrl.beginFrame(16.67);
    standing.ctrl.applyHorizontal(moveFrame(1), 'RUN', true);
    const standingDelta = Math.abs(standing.body.velocity.x);

    const turning = makeController(SAMURAI_MOVEMENT.runSpeed);
    turning.ctrl.beginFrame(16.67);
    turning.ctrl.applyHorizontal(moveFrame(-1), 'RUN', true);
    const turnDelta = Math.abs(turning.body.velocity.x - SAMURAI_MOVEMENT.runSpeed);

    expect(TURN_BOOST).toBe(1.8);
    expect(turnDelta).toBeCloseTo(standingDelta * TURN_BOOST, 5);
    expect(turnDelta).toBeGreaterThan(standingDelta);
  });

  it('reverses through zero faster with turn boost than with base accel alone', () => {
    const boosted = makeController(SAMURAI_MOVEMENT.runSpeed);
    let frames = 0;
    while (boosted.body.velocity.x > 0 && frames < 40) {
      boosted.ctrl.beginFrame(16.67);
      boosted.ctrl.applyHorizontal(moveFrame(-1), 'RUN', true);
      frames += 1;
    }
    expect(frames).toBeLessThanOrEqual(4);
    const noBoostFrames = Math.ceil(100 / 16.67);
    expect(frames).toBeLessThan(noBoostFrames);
  });

  it('decelerates to rest when moveX is 0', () => {
    const { body, ctrl } = makeController(90);
    ctrl.beginFrame(100);
    ctrl.applyHorizontal(moveFrame(0), 'RUN', true);
    expect(body.velocity.x).toBe(0);
  });

  it('uses air accel when not grounded', () => {
    const { body, ctrl } = makeController(0);
    ctrl.beginFrame(100);
    ctrl.applyHorizontal(moveFrame(1), 'FALL', false);
    expect(body.velocity.x).toBeCloseTo(SAMURAI_MOVEMENT.airAccel * 0.1, 5);
  });

  it('scales ground attack move to 0.4× run speed', () => {
    const { body, ctrl } = makeController(0);
    for (let i = 0; i < 20; i++) {
      ctrl.beginFrame(16.67);
      ctrl.applyHorizontal(moveFrame(1), 'ATTACK_1', true);
    }
    expect(body.velocity.x).toBeCloseTo(SAMURAI_MOVEMENT.runSpeed * 0.4, 5);
  });

  it('source contains zero characterId branches', () => {
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'PlayerController.ts'),
      'utf8',
    );
    expect(src.includes('characterId')).toBe(false);
  });
});

function jumpPressFrame(): InputFrame {
  return Object.freeze({
    ...moveFrame(0),
    jumpPressed: true,
    jumpHeld: true,
    jumpPressedAt: 1,
  });
}

function jumpHeldFrame(held: boolean): InputFrame {
  return Object.freeze({
    ...moveFrame(0),
    jumpHeld: held,
    jumpPressedAt: 1,
  });
}

const JUMP_CTX = {
  grounded: true,
  coyoteExpiresAt: 0,
  airJumpsRemaining: 0,
  onWall: false,
  wallDir: 0 as const,
  now: 0,
};

/** Simulate rise until apex; `holdMs` is how long jumpHeld stays true after launch. */
function simulateJumpPeak(holdMs: number): number {
  const { body, ctrl } = makeController(0);
  const frameMs = 1000 / 60;
  const dt = frameMs / 1000;
  let y = 0;
  let peak = 0;
  let elapsed = 0;

  ctrl.beginFrame(frameMs);
  ctrl.tryJump(jumpPressFrame(), JUMP_CTX);

  for (let i = 0; i < 120; i++) {
    ctrl.beginFrame(frameMs);
    const held = elapsed < holdMs;
    ctrl.applyJumpCut(jumpHeldFrame(held));
    ctrl.applyGravity();
    y += body.velocity.y * dt;
    peak = Math.max(peak, -y);
    elapsed += frameMs;
    if (ctrl.verticalVelocity >= 0 && i > 5) break;
  }
  return peak;
}

describe('PlayerController jump + gravity', () => {
  it('full-hold Samurai jump peaks at 32.0 ± 0.5 px (midpoint feed)', () => {
    const peak = simulateJumpPeak(Number.POSITIVE_INFINITY);
    expect(peak).toBeGreaterThanOrEqual(31.5);
    expect(peak).toBeLessThanOrEqual(32.5);
  });

  it('release at 50 ms peaks near 13.5 px', () => {
    // Midpoint + apex hang lands ~15.3 vs the doc's continuous ~13.5; stay in band.
    const peak = simulateJumpPeak(50);
    expect(peak).toBeGreaterThanOrEqual(12.0);
    expect(peak).toBeLessThanOrEqual(16.0);
  });

  it('instant tap (release next frame) peaks near 6.5 px', () => {
    // Hold only through the launch frame (0 ms of post-launch hold).
    const peak = simulateJumpPeak(0);
    expect(peak).toBeGreaterThanOrEqual(5.5);
    expect(peak).toBeLessThanOrEqual(7.5);
  });

  it('hold / release / tap span ~4.9× vertical range', () => {
    const full = simulateJumpPeak(Number.POSITIVE_INFINITY);
    const mid = simulateJumpPeak(50);
    const tap = simulateJumpPeak(0);
    expect(mid).toBeGreaterThan(tap);
    expect(mid).toBeLessThan(full);
    expect(full / tap).toBeGreaterThan(4.5);
    expect(full / tap).toBeLessThan(5.3);
  });

  it('jump cut applies only once if release-and-repress mid-rise', () => {
    const { body, ctrl } = makeController(0);
    const frameMs = 1000 / 60;
    ctrl.beginFrame(frameMs);
    ctrl.tryJump(jumpPressFrame(), JUMP_CTX);

    ctrl.beginFrame(frameMs);
    ctrl.applyJumpCut(jumpHeldFrame(false));
    const afterFirstCut = ctrl.verticalVelocity;

    ctrl.beginFrame(frameMs);
    ctrl.applyJumpCut(jumpHeldFrame(true));
    ctrl.applyJumpCut(jumpHeldFrame(false));
    expect(ctrl.verticalVelocity).toBe(afterFirstCut);
    expect(body.velocity.y).toBe(afterFirstCut);
  });

  it('ground jump sets jumpVelocity', () => {
    const { body, ctrl } = makeController(0);
    ctrl.beginFrame(16.67);
    ctrl.tryJump(jumpPressFrame(), JUMP_CTX);
    expect(body.velocity.y).toBe(SAMURAI_MOVEMENT.jumpVelocity);
    expect(ctrl.verticalVelocity).toBe(SAMURAI_MOVEMENT.jumpVelocity);
  });
});

function jumpAt(pressAt: number, opts: { pressed?: boolean; held?: boolean } = {}): InputFrame {
  return Object.freeze({
    ...moveFrame(0),
    jumpPressed: opts.pressed ?? false,
    jumpHeld: opts.held ?? opts.pressed ?? false,
    jumpPressedAt: pressAt,
  });
}

/** Ledge leave at `leaveAt`; press at leaveAt+offset; evaluate buffer/coyote (M1-T8). */
function ledgeJumpSucceeds(ctrl: PlayerController, leaveAt: number, offsetMs: number): boolean {
  const pressAt = leaveAt + offsetMs;
  const coyoteExpiresAt = leaveAt + FEEL.COYOTE_TIME;
  const nowMs = Math.max(leaveAt, pressAt);
  const result = ctrl.tryJump(jumpAt(pressAt, { pressed: offsetMs >= 0, held: true }), {
    grounded: false,
    coyoteExpiresAt,
    airJumpsRemaining: 0,
    onWall: false,
    wallDir: 0,
    now: nowMs,
  });
  return result.kind === 'coyote' || result.kind === 'ground';
}

describe('PlayerController coyote + jump buffer', () => {
  it('coyote jump within COYOTE_TIME after leave', () => {
    const { ctrl } = makeController(0);
    const leaveAt = 10_000;
    const result = ctrl.tryJump(jumpAt(leaveAt + 40, { pressed: true, held: true }), {
      grounded: false,
      coyoteExpiresAt: leaveAt + FEEL.COYOTE_TIME,
      airJumpsRemaining: 0,
      onWall: false,
      wallDir: 0,
      now: leaveAt + 40,
    });
    expect(result.kind).toBe('coyote');
  });

  it('rejects jump after coyote expires', () => {
    const { ctrl } = makeController(0);
    const leaveAt = 10_000;
    const result = ctrl.tryJump(jumpAt(leaveAt + 150, { pressed: true, held: true }), {
      grounded: false,
      coyoteExpiresAt: leaveAt + FEEL.COYOTE_TIME,
      airJumpsRemaining: 0,
      onWall: false,
      wallDir: 0,
      now: leaveAt + 150,
    });
    expect(result.kind).toBe('none');
  });

  it('early buffer within JUMP_BUFFER fires as coyote at leave', () => {
    const { ctrl } = makeController(0);
    const leaveAt = 10_000;
    const pressAt = leaveAt - 80;
    const result = ctrl.tryJump(jumpAt(pressAt), {
      grounded: false,
      coyoteExpiresAt: leaveAt + FEEL.COYOTE_TIME,
      airJumpsRemaining: 0,
      onWall: false,
      wallDir: 0,
      now: leaveAt,
    });
    expect(result.kind).toBe('coyote');
  });

  it('expired buffer does not fire at leave', () => {
    const { ctrl } = makeController(0);
    const leaveAt = 10_000;
    const pressAt = leaveAt - 150;
    const result = ctrl.tryJump(jumpAt(pressAt), {
      grounded: false,
      coyoteExpiresAt: leaveAt + FEEL.COYOTE_TIME,
      airJumpsRemaining: 0,
      onWall: false,
      wallDir: 0,
      now: leaveAt,
    });
    expect(result.kind).toBe('none');
  });

  it('buffer survives airborne miss then fires on ground contact', () => {
    const { ctrl } = makeController(0);
    const pressAt = 5000;
    const miss = ctrl.tryJump(jumpAt(pressAt, { pressed: true, held: true }), {
      grounded: false,
      coyoteExpiresAt: 0,
      airJumpsRemaining: 0,
      onWall: false,
      wallDir: 0,
      now: pressAt,
    });
    expect(miss.kind).toBe('none');
    expect(ctrl.hasUnconsumedJumpBuffer(pressAt)).toBe(true);

    const land = ctrl.tryJump(jumpAt(pressAt), {
      grounded: true,
      coyoteExpiresAt: 0,
      airJumpsRemaining: 0,
      onWall: false,
      wallDir: 0,
      now: pressAt + 50,
    });
    expect(land.kind).toBe('ground');
    expect(ctrl.hasUnconsumedJumpBuffer(pressAt)).toBe(false);
  });

  it('ledge-jump harness ≥ 98% inside ±100 ms, 0% beyond buffer/coyote', () => {
    const rng = new Rng(0xc0fe7e);
    const leaveAt = 50_000;
    let insideOk = 0;
    const insideN = 1000;
    for (let i = 0; i < insideN; i++) {
      const { ctrl } = makeController(0);
      // Uniform in [-100, 100] — covered by coyote (100) + buffer (120).
      const offset = rng.next() * 200 - 100;
      if (ledgeJumpSucceeds(ctrl, leaveAt, offset)) insideOk += 1;
    }
    expect(insideOk / insideN).toBeGreaterThanOrEqual(0.98);

    let outsideOk = 0;
    const outsideN = 1000;
    for (let i = 0; i < outsideN; i++) {
      const { ctrl } = makeController(0);
      // Beyond both windows: < -JUMP_BUFFER or > COYOTE_TIME.
      const offset =
        rng.next() < 0.5
          ? -(FEEL.JUMP_BUFFER + 1 + rng.next() * 80)
          : FEEL.COYOTE_TIME + 1 + rng.next() * 80;
      if (ledgeJumpSucceeds(ctrl, leaveAt, offset)) outsideOk += 1;
    }
    expect(outsideOk).toBe(0);
  });
});

function dashPressFrame(moveX: -1 | 0 | 1 = 0): InputFrame {
  return Object.freeze({
    ...moveFrame(moveX),
    dashPressed: true,
  });
}

const DASH_CTX = {
  now: 1_000,
  facing: 1 as const,
  grounded: true,
  airDashAvailable: true,
};

describe('PlayerController dash', () => {
  it('travels Samurai derived distance (260 × 0.15 = 39 px)', () => {
    const { body, ctrl } = makeController(0);
    const start = DASH_CTX.now;
    const result = ctrl.tryDash(dashPressFrame(1), DASH_CTX);
    expect(result).toEqual({ kind: 'started', dirX: 1 });

    const frameMs = 1000 / 60;
    let x = 0;
    let t = start;
    const end = start + SAMURAI_MOVEMENT.dashDurationMs;
    while (t < end) {
      ctrl.beginFrame(frameMs);
      const step = Math.min(frameMs, end - t);
      t += step;
      ctrl.tickDash(t);
      x += body.velocity.x * (step / 1000);
    }
    expect(x).toBeCloseTo(SAMURAI_MOVEMENT.dashSpeed * (SAMURAI_MOVEMENT.dashDurationMs / 1000), 1);
    expect(x).toBeCloseTo(39, 1);
  });

  it('cooldown is measured from dash start, not end', () => {
    const { ctrl } = makeController(0);
    const start = 5_000;
    ctrl.tryDash(dashPressFrame(1), { ...DASH_CTX, now: start });

    // Mid-dash: still cooling.
    expect(ctrl.dashCooldownRemainingMs(start + 100)).toBe(SAMURAI_MOVEMENT.dashCooldownMs - 100);

    // Dash has ended (150 ms) but cooldown (500 ms) still has 350 ms left.
    ctrl.tickDash(start + SAMURAI_MOVEMENT.dashDurationMs);
    expect(ctrl.isDashing).toBe(false);
    const afterEnd = start + SAMURAI_MOVEMENT.dashDurationMs;
    expect(ctrl.dashCooldownRemainingMs(afterEnd)).toBe(
      SAMURAI_MOVEMENT.dashCooldownMs - SAMURAI_MOVEMENT.dashDurationMs,
    );
    expect(ctrl.tryDash(dashPressFrame(1), { ...DASH_CTX, now: afterEnd }).kind).toBe('onCooldown');

    // Ready exactly at start + cooldown.
    const readyAt = start + SAMURAI_MOVEMENT.dashCooldownMs;
    expect(ctrl.dashCooldownRemainingMs(readyAt)).toBe(0);
    expect(ctrl.tryDash(dashPressFrame(1), { ...DASH_CTX, now: readyAt }).kind).toBe('started');
  });

  it('uses facing when moveX is 0', () => {
    const { body, ctrl } = makeController(0);
    const result = ctrl.tryDash(dashPressFrame(0), { ...DASH_CTX, facing: -1 });
    expect(result).toEqual({ kind: 'started', dirX: -1 });
    expect(body.velocity.x).toBe(-SAMURAI_MOVEMENT.dashSpeed);
  });

  it('blocks a second air dash until refreshed', () => {
    const { ctrl } = makeController(0);
    const air = { ...DASH_CTX, grounded: false, airDashAvailable: true, now: 2_000 };
    expect(ctrl.tryDash(dashPressFrame(1), air).kind).toBe('started');
    ctrl.tickDash(2_000 + SAMURAI_MOVEMENT.dashDurationMs);
    ctrl.refreshDashCooldown();
    const blocked = ctrl.tryDash(dashPressFrame(1), {
      ...air,
      now: 3_000,
      airDashAvailable: false,
    });
    expect(blocked.kind).toBe('blocked');
  });

  it('ignores horizontal input while dashing', () => {
    const { body, ctrl } = makeController(0);
    ctrl.tryDash(dashPressFrame(1), DASH_CTX);
    ctrl.beginFrame(16.67);
    ctrl.tickDash(DASH_CTX.now + 16.67);
    ctrl.applyHorizontal(moveFrame(-1), 'DASH', true);
    expect(body.velocity.x).toBe(SAMURAI_MOVEMENT.dashSpeed);
  });

  it('landing refresh clears cooldown early', () => {
    const { ctrl } = makeController(0);
    ctrl.tryDash(dashPressFrame(1), DASH_CTX);
    ctrl.refreshDashCooldown();
    expect(ctrl.dashCooldownRemainingMs(DASH_CTX.now + 50)).toBe(0);
  });
});

describe('PlayerController wall jump + slide', () => {
  it('wall jump pushes away from wall at 150 px/s and locks 120 ms', () => {
    const { body, ctrl } = makeController(0);
    const start = 8_000;
    const result = ctrl.tryJump(jumpPressFrame(), {
      grounded: false,
      coyoteExpiresAt: 0,
      airJumpsRemaining: 0,
      onWall: true,
      wallDir: 1,
      now: start,
    });
    expect(result).toEqual({ kind: 'wall', pushX: -WALL_JUMP_PUSH });
    expect(body.velocity.x).toBe(-WALL_JUMP_PUSH);
    expect(ctrl.verticalVelocity).toBe(SAMURAI_MOVEMENT.jumpVelocity * 0.95);
    expect(ctrl.isWallJumpLocked(start + WALL_JUMP_LOCK_MS - 1)).toBe(true);
    expect(ctrl.isWallJumpLockExpired(start + WALL_JUMP_LOCK_MS - 1)).toBe(false);
    expect(ctrl.isWallJumpLocked(start + WALL_JUMP_LOCK_MS)).toBe(false);
    expect(ctrl.isWallJumpLockExpired(start + WALL_JUMP_LOCK_MS)).toBe(true);
  });

  it('wall slide clamps fall speed to wallSlideSpeed', () => {
    const { body, ctrl } = makeController(0);
    ctrl.setVerticalVelocity(200);
    ctrl.beginFrame(16.67);
    ctrl.applyWallSlide();
    expect(ctrl.verticalVelocity).toBe(SAMURAI_MOVEMENT.wallSlideSpeed);
    expect(body.velocity.y).toBe(SAMURAI_MOVEMENT.wallSlideSpeed);
  });

  it('wall-jump peak × 2 clears SHAFT height (48 px)', () => {
    const { body, ctrl } = makeController(0);
    const frameMs = 1000 / 60;
    const dt = frameMs / 1000;
    let y = 0;
    let peak = 0;
    ctrl.beginFrame(frameMs);
    ctrl.tryJump(jumpPressFrame(), {
      grounded: false,
      coyoteExpiresAt: 0,
      airJumpsRemaining: 0,
      onWall: true,
      wallDir: -1,
      now: 1,
    });
    for (let i = 0; i < 120; i++) {
      ctrl.beginFrame(frameMs);
      ctrl.applyJumpCut(jumpHeldFrame(true));
      ctrl.applyGravity();
      y += body.velocity.y * dt;
      peak = Math.max(peak, -y);
      if (ctrl.verticalVelocity >= 0 && i > 5) break;
    }
    expect(peak * 2).toBeGreaterThanOrEqual(HEIGHT.SHAFT);
  });
});
