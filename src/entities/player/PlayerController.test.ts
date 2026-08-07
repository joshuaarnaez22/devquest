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
