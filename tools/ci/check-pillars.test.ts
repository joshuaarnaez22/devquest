/**
 * Pillar 1 automated targets — docs/02-Game-Pillars.md §5.1.3 / §6.3 · M1-T19.
 * Run via `npm run test:pillars` (CI required gate · Checkpoint D).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BUDGET, FEEL } from '@config/GameConstants';
import { Rng } from '@core/Rng';
import { Health } from '@components/Health';
import { Hitbox } from '@components/Hitbox';
import { IFrames } from '@components/IFrames';
import { Poise } from '@components/Poise';
import { SAMURAI_COMBO } from '@entities/player/CharacterCombat';
import { SAMURAI_MOVEMENT } from '@entities/player/CharacterMovement';
import { FrozenInputLatch } from '@entities/player/FrozenInputLatch';
import { PlayerController } from '@entities/player/PlayerController';
import { PLAYER_STATE_DURATION_MS } from '@entities/player/PlayerStates';
import * as Clock from '@platform/Clock';
import * as GamepadAdapter from '@platform/GamepadAdapter';
import * as Keyboard from '@platform/Keyboard';
import { CameraSystem } from '@systems/CameraSystem';
import { CombatSystem } from '@systems/CombatSystem';
import { HitQueue } from '@systems/HitQueue';
import { HitStopSystem } from '@systems/HitStopSystem';
import { INPUT_LATENCY_BUDGET_MS, InputSystem } from '@systems/InputSystem';
import type { InputFrame } from '@core/InputFrame';
import type { CombatSinks, CombatVictim } from '@systems/CombatSystem';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

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

function jumpAt(pressAt: number, opts: { pressed?: boolean; held?: boolean } = {}): InputFrame {
  return Object.freeze({
    ...moveFrame(0),
    jumpPressed: opts.pressed ?? false,
    jumpHeld: opts.held ?? opts.pressed ?? false,
    jumpPressedAt: pressAt,
  });
}

function makeController(vx = 0): {
  body: { velocity: { x: number; y: number } };
  ctrl: PlayerController;
} {
  const body = { velocity: { x: vx, y: 0 } };
  return { body, ctrl: new PlayerController(body, SAMURAI_MOVEMENT) };
}

/** Ledge leave at `leaveAt`; press at leaveAt+offset — coyote/buffer harness. */
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

describe('p1.latency — input-to-velocity ≤ 1 frame', () => {
  let input: InputSystem;

  beforeEach(() => {
    Clock.__resetOffset();
    Keyboard.__reset();
    GamepadAdapter.__setGamepads([]);
    input = new InputSystem();
    input.init();
  });

  afterEach(() => {
    input.destroy();
    Keyboard.__reset();
    GamepadAdapter.__setGamepads(null);
    Clock.__resetOffset();
  });

  it('applies jump velocity on the same sample frame as keydown', () => {
    input.update(0, BUDGET.FRAME_MS);
    const keydownAt = Clock.now();
    Keyboard.__press('Space', keydownAt);
    Clock.__setOffsetMs(1);
    input.update(BUDGET.FRAME_MS, BUDGET.FRAME_MS);

    expect(input.frame.jumpPressed).toBe(true);
    const sampleLatency = input.lastSampleAt - keydownAt;
    expect(sampleLatency).toBeLessThanOrEqual(INPUT_LATENCY_BUDGET_MS);
    expect(sampleLatency).toBeLessThanOrEqual(BUDGET.FRAME_MS);

    const { body, ctrl } = makeController(0);
    ctrl.beginFrame(BUDGET.FRAME_MS);
    const result = ctrl.tryJump(input.frame, {
      grounded: true,
      coyoteExpiresAt: 0,
      airJumpsRemaining: 0,
      onWall: false,
      wallDir: 0,
      now: input.lastSampleAt,
    });
    expect(result.kind).toBe('ground');
    expect(body.velocity.y).toBe(SAMURAI_MOVEMENT.jumpVelocity);
  });
});

describe('p1.coyote — ledge-jump ≥ 98% over 1,000 attempts', () => {
  it('succeeds ≥ 98% for presses within ±100 ms of ledge leave', () => {
    const rng = new Rng(0xc0fe7e);
    const leaveAt = 50_000;
    let ok = 0;
    const n = 1000;
    for (let i = 0; i < n; i++) {
      const { ctrl } = makeController(0);
      const offset = rng.next() * 200 - 100;
      if (ledgeJumpSucceeds(ctrl, leaveAt, offset)) ok += 1;
    }
    expect(ok / n).toBeGreaterThanOrEqual(0.98);
  });
});

describe('p1.fuzz — 0 dropped inputs per 10,000', () => {
  let input: InputSystem;

  beforeEach(() => {
    Clock.__resetOffset();
    Keyboard.__reset();
    GamepadAdapter.__setGamepads([]);
    input = new InputSystem();
    input.init();
  });

  afterEach(() => {
    input.destroy();
    Keyboard.__reset();
    GamepadAdapter.__setGamepads(null);
    Clock.__resetOffset();
  });

  it('records every intentional press as a state change', () => {
    const rng = new Rng(0xf022_1a7e);
    let dropped = 0;
    const n = 10_000;
    let t = 0;

    for (let i = 0; i < n; i++) {
      Keyboard.__reset();
      input.update(t, BUDGET.FRAME_MS);
      t += BUDGET.FRAME_MS;

      const kind = rng.nextInt(4) as 0 | 1 | 2 | 3;
      const probe = makeController(0);
      probe.ctrl.beginFrame(BUDGET.FRAME_MS);
      const sample = (): void => {
        input.update(t, BUDGET.FRAME_MS);
        t += BUDGET.FRAME_MS;
      };

      if (kind === 0) {
        if (!fuzzJump(input, probe, sample)) dropped += 1;
      } else if (kind === 1) {
        if (!fuzzMove(input, probe, sample, { code: 'KeyD', expectedX: 1 })) dropped += 1;
      } else if (kind === 2) {
        if (!fuzzMove(input, probe, sample, { code: 'KeyA', expectedX: -1 })) dropped += 1;
      } else if (!fuzzDash(input, probe, sample)) {
        dropped += 1;
      }
    }

    expect(dropped).toBe(0);
  });
});

function fuzzJump(
  input: InputSystem,
  probe: ReturnType<typeof makeController>,
  sample: () => void,
): boolean {
  const at = Clock.now();
  Keyboard.__press('Space', at);
  sample();
  if (!input.frame.jumpPressed) return false;
  const result = probe.ctrl.tryJump(input.frame, {
    grounded: true,
    coyoteExpiresAt: 0,
    airJumpsRemaining: 0,
    onWall: false,
    wallDir: 0,
    now: input.lastSampleAt,
  });
  return result.kind === 'ground' && probe.body.velocity.y === SAMURAI_MOVEMENT.jumpVelocity;
}

function fuzzMove(
  input: InputSystem,
  probe: ReturnType<typeof makeController>,
  sample: () => void,
  opts: { readonly code: string; readonly expectedX: -1 | 1 },
): boolean {
  Keyboard.__press(opts.code);
  sample();
  if (input.frame.moveX !== opts.expectedX) return false;
  const before = probe.body.velocity.x;
  probe.ctrl.applyHorizontal(input.frame, 'RUN', true);
  return opts.expectedX > 0 ? probe.body.velocity.x > before : probe.body.velocity.x < before;
}

function fuzzDash(
  input: InputSystem,
  probe: ReturnType<typeof makeController>,
  sample: () => void,
): boolean {
  Keyboard.__press('ShiftLeft');
  sample();
  if (!input.frame.dashPressed) return false;
  const result = probe.ctrl.tryDash(input.frame, {
    now: input.lastSampleAt,
    facing: 1,
    grounded: true,
    airDashAvailable: true,
  });
  return result.kind === 'started';
}
describe('p1.noLandingRecovery — LAND duration === 0', () => {
  it('LAND is a 0 ms pass-through (Pillar 1 falsification #5)', () => {
    expect(PLAYER_STATE_DURATION_MS.LAND).toBe(0);
  });
});

describe('p1.animatorReadonly — animator has no body access', () => {
  it('PlayerAnimator.ts never references .body', () => {
    const src = readFileSync(join(repoRoot, 'src/entities/player/PlayerAnimator.ts'), 'utf8');
    expect(src.includes('.body')).toBe(false);
  });
});

/**
 * Pillar 2 automated targets — docs/02-Game-Pillars.md, docs/07-Combat.md §6 · M2-T15.
 */

function makeVictim(overrides: Partial<CombatVictim> = {}): CombatVictim {
  return {
    id: 2,
    isPlayer: false,
    active: true,
    health: new Health(100),
    // High enough that this test's single hit never breaks poise — a break fires
    // a second `burstParticles` (poise_break), which isn't one of the nine layers.
    poise: new Poise(999, 1500),
    iFrames: new IFrames(),
    knockbackTaken: 1,
    knockbackResist: 0,
    armour: 0,
    poiseResist: 0,
    baseStaggerMs: 400,
    centre: { x: 10, y: 0 },
    facing: 1,
    ...overrides,
  };
}

describe('p2.nineLayers — every HitResolution fires all nine feedback layers (§6.1)', () => {
  it('resolveQueuedHits invokes every CombatSinks layer exactly once for one hit', () => {
    const step = SAMURAI_COMBO[0];
    expect(step).toBeDefined();
    if (!step) return;

    const hitbox = new Hitbox();
    hitbox.schedule(0, 0, 83, { width: 20, height: 16, offsetX: 12, offsetY: 0 });
    hitbox.update(0);

    const queue = new HitQueue();
    queue.queue({
      hitbox,
      attackerId: 1,
      victimId: 2,
      point: { x: 5, y: 0 },
      source: 'melee',
      step,
    });

    const victims = new Map<number, CombatVictim>([
      [2, makeVictim()],
      [1, makeVictim({ id: 1, isPlayer: true, centre: { x: 0, y: 0 } })],
    ]);

    const sinks: CombatSinks = {
      requestHitStop: vi.fn(),
      applyFlash: vi.fn(),
      applyKnockback: vi.fn(),
      spawnSlashVfx: vi.fn(),
      addCameraTrauma: vi.fn(),
      burstParticles: vi.fn(),
      applyStagger: vi.fn(),
      spawnDamageNumber: vi.fn(),
      applyDeath: vi.fn(),
      emitHit: vi.fn(),
      // `delay` is scheduling infra, not a layer (HitResolution's own doc comment)
      // — run synchronously so the deferred layers are observable here too.
      delay: (_ms, cb) => cb(),
    };

    new CombatSystem(queue, victims, sinks, () => 0).resolveQueuedHits();

    // The nine feedback layers (§6.1). `applyDeath` is excluded — it only fires
    // when `res.fatal`, not on every hit.
    expect(sinks.requestHitStop).toHaveBeenCalledTimes(1);
    expect(sinks.applyFlash).toHaveBeenCalledTimes(1);
    expect(sinks.applyKnockback).toHaveBeenCalledTimes(1);
    expect(sinks.spawnSlashVfx).toHaveBeenCalledTimes(1);
    expect(sinks.addCameraTrauma).toHaveBeenCalledTimes(1);
    expect(sinks.burstParticles).toHaveBeenCalledTimes(1);
    expect(sinks.applyStagger).toHaveBeenCalledTimes(1);
    expect(sinks.spawnDamageNumber).toHaveBeenCalledTimes(1);
    expect(sinks.emitHit).toHaveBeenCalledTimes(1);
  });
});

describe('p2.hitStopNotAdditive — two 110 ms requests freeze for 110 ms, not 220 ms (§6.2 P2)', () => {
  beforeEach(() => Clock.__resetOffset());
  afterEach(() => Clock.__resetOffset());

  it('longest wins — a second same-instant request never extends the freeze', () => {
    const hs = new HitStopSystem();
    hs.request(110, [1]);
    hs.request(110, [1]); // two hits landing the same frame

    Clock.__setOffsetMs(109);
    expect(hs.isFrozen(1)).toBe(true);
    Clock.__setOffsetMs(110);
    expect(hs.isFrozen(1)).toBe(false);
  });
});

describe('p2.inputBuffered — input during hit stop applies on the first unfrozen frame (§6.2 P3)', () => {
  it('a press latched while frozen is honoured exactly once, then cleared', () => {
    const latch = new FrozenInputLatch();
    latch.captureWhileFrozen({ attackPressed: false, dashPressed: false, specialPressed: false });
    latch.captureWhileFrozen({ attackPressed: true, dashPressed: false, specialPressed: false });
    latch.captureWhileFrozen({ attackPressed: false, dashPressed: false, specialPressed: false });

    const firstUnfrozenFrame = latch.applyAndClear({ attack: false, dash: false, special: false });
    expect(firstUnfrozenFrame.attack).toBe(true);

    const nextFrame = latch.applyAndClear({ attack: false, dash: false, special: false });
    expect(nextFrame.attack).toBe(false);
  });
});

describe('p2.traumaClamped — camera trauma never exceeds 1.0 (§6.6)', () => {
  it('repeated large addTrauma calls clamp at MAX_TRAUMA', () => {
    expect(CameraSystem.MAX_TRAUMA).toBe(1.0);
    const cam = new CameraSystem();
    for (let i = 0; i < 20; i++) cam.addTrauma(5);
    expect(cam.traumaLevel).toBe(1.0);
  });
});

describe('p2.noEnemyIFrames — enemies are hittable every overlapping frame (§9.2)', () => {
  it('Skeleton.ts never grants its own iFrames ("Enemies have none")', () => {
    const src = readFileSync(join(repoRoot, 'src/entities/enemy/Skeleton.ts'), 'utf8');
    expect(src.includes('iFrames.grant')).toBe(false);
  });

  it('an ungranted IFrames is never active, so CombatSystem never skips the hit', () => {
    const iFrames = new IFrames();
    expect(iFrames.isActive(0)).toBe(false);
    expect(iFrames.isActive(1_000_000)).toBe(false);
  });
});
