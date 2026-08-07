import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BUDGET } from '@config/GameConstants';
import * as Clock from '@platform/Clock';
import * as GamepadAdapter from '@platform/GamepadAdapter';
import * as Keyboard from '@platform/Keyboard';
import { INPUT_LATENCY_BUDGET_MS, InputSystem } from '@systems/InputSystem';

function fakePad(partial: {
  id?: string;
  buttons?: Partial<Record<number, boolean>>;
  axes?: readonly number[];
}): Gamepad {
  const buttons: GamepadButton[] = [];
  for (let i = 0; i < 16; i++) {
    const pressed = partial.buttons?.[i] === true;
    buttons.push({ pressed, touched: pressed, value: pressed ? 1 : 0 });
  }
  return {
    id: partial.id ?? 'Xbox Controller',
    index: 0,
    connected: true,
    mapping: 'standard',
    buttons,
    axes: partial.axes ?? [0, 0, 0, 0],
    timestamp: 0,
  } as unknown as Gamepad;
}

describe('InputSystem', () => {
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

  it('rebuilds an immutable InputFrame each update', () => {
    input.update(0, 16);
    const a = input.frame;
    Keyboard.__press('KeyD');
    input.update(16, 16);
    const b = input.frame;
    expect(a).not.toBe(b);
    expect(Object.isFrozen(b)).toBe(true);
    expect(b.moveX).toBe(1);
  });

  it('detects jump edge, hold, and release', () => {
    input.update(0, 16);
    expect(input.frame.jumpPressed).toBe(false);

    Keyboard.__press('Space');
    input.update(16, 16);
    expect(input.frame.jumpPressed).toBe(true);
    expect(input.frame.jumpHeld).toBe(true);
    expect(input.frame.jumpReleased).toBe(false);

    input.update(32, 16);
    expect(input.frame.jumpPressed).toBe(false);
    expect(input.frame.jumpHeld).toBe(true);

    Keyboard.__release('Space');
    input.update(48, 16);
    expect(input.frame.jumpReleased).toBe(true);
    expect(input.frame.jumpHeld).toBe(false);
  });

  it('accepts all three default jump bindings', () => {
    for (const code of ['Space', 'KeyW', 'ArrowUp'] as const) {
      Keyboard.__reset();
      input = new InputSystem();
      input.update(0, 16);
      Keyboard.__press(code);
      input.update(16, 16);
      expect(input.frame.jumpPressed).toBe(true);
    }
  });

  it('digitizes stick with 0.30 radial deadzone — no analog speed', () => {
    GamepadAdapter.__setGamepads([
      fakePad({ axes: [0.2, 0, 0, 0] }), // inside deadzone
    ]);
    input.update(0, 16);
    expect(input.frame.moveX).toBe(0);

    GamepadAdapter.__setGamepads([fakePad({ axes: [0.5, 0, 0, 0] })]);
    input.update(16, 16);
    expect(input.frame.moveX).toBe(1);
  });

  it('switches device on stick displacement > 0.5', () => {
    Keyboard.__press('KeyD');
    input.update(0, 16);
    expect(input.frame.device).toBe('keyboard');

    Keyboard.__release('KeyD');
    GamepadAdapter.__setGamepads([fakePad({ axes: [0.6, 0, 0, 0] })]);
    input.update(16, 16);
    expect(input.frame.device).toBe('gamepad');
    expect(input.frame.gamepadKind).toBe('xbox');
    expect(input.frame.moveX).toBe(1);
  });

  it('ORs keyboard and gamepad so either device can act', () => {
    GamepadAdapter.__setGamepads([fakePad({ buttons: { 0: true } })]);
    input.update(0, 16);
    expect(input.frame.jumpHeld).toBe(true);
    expect(input.frame.device).toBe('gamepad');
  });

  it('input-to-frame latency is ≤ 1 frame (Pillar 1)', () => {
    input.update(0, 16);
    const keydownAt = Clock.now();
    Keyboard.__press('Space', keydownAt);
    // Same-frame sample after a small clock advance still within budget
    Clock.__setOffsetMs(10);
    input.update(16, 16);

    expect(input.frame.jumpPressed).toBe(true);
    const latency = input.lastSampleAt - keydownAt;
    expect(latency).toBeLessThanOrEqual(INPUT_LATENCY_BUDGET_MS);
    expect(latency).toBeLessThanOrEqual(BUDGET.FRAME_MS);
    expect(input.frame.jumpPressedAt).toBe(keydownAt);
  });
});
