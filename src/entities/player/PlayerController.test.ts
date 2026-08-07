import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SAMURAI_MOVEMENT } from '@entities/player/CharacterMovement';
import { PlayerController, TURN_BOOST } from '@entities/player/PlayerController';
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

describe('PlayerController jump + gravity', () => {
  it('full-hold Samurai jump peaks at 32.0 ± 0.5 px (midpoint feed)', () => {
    const { body, ctrl } = makeController(0);
    const frameMs = 1000 / 60;
    const dt = frameMs / 1000;
    let y = 0;
    let peak = 0;

    ctrl.beginFrame(frameMs);
    const result = ctrl.tryJump(jumpPressFrame(), {
      grounded: true,
      coyoteExpiresAt: 0,
      airJumpsRemaining: 0,
      onWall: false,
      wallDir: 0,
      now: 0,
    });
    expect(result.kind).toBe('ground');

    // Same order as FeelPlayer: gravity on the jump frame, then Phaser y += v·dt.
    for (let i = 0; i < 120; i++) {
      ctrl.beginFrame(frameMs);
      ctrl.applyGravity();
      y += body.velocity.y * dt;
      peak = Math.max(peak, -y);
      if (ctrl.verticalVelocity >= 0 && i > 5) break;
    }

    expect(peak).toBeGreaterThanOrEqual(31.5);
    expect(peak).toBeLessThanOrEqual(32.5);
  });

  it('ground jump sets jumpVelocity', () => {
    const { body, ctrl } = makeController(0);
    ctrl.beginFrame(16.67);
    ctrl.tryJump(jumpPressFrame(), {
      grounded: true,
      coyoteExpiresAt: 0,
      airJumpsRemaining: 0,
      onWall: false,
      wallDir: 0,
      now: 0,
    });
    expect(body.velocity.y).toBe(SAMURAI_MOVEMENT.jumpVelocity);
    expect(ctrl.verticalVelocity).toBe(SAMURAI_MOVEMENT.jumpVelocity);
  });
});
