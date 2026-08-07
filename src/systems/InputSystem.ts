import { BUDGET } from '@config/GameConstants';
import {
  ANALOG_DEADZONE,
  DEFAULT_INPUT_BINDINGS,
  DEVICE_SWITCH_STICK,
} from '@config/InputMap';
import { now } from '@platform/Clock';
import * as GamepadAdapter from '@platform/GamepadAdapter';
import * as Keyboard from '@platform/Keyboard';
import type { GameAction, GamepadKind, InputBindings } from '@config/InputMap';
import type { System } from '@core/SystemRegistry';

export type DigitalAxis = -1 | 0 | 1;
export type InputDevice = 'keyboard' | 'gamepad';

/** Immutable per-frame input snapshot — docs/13-UI-UX.md §5.2. */
export interface InputFrame {
  readonly moveX: DigitalAxis;
  readonly moveY: DigitalAxis;
  readonly jumpPressed: boolean;
  readonly jumpHeld: boolean;
  readonly jumpReleased: boolean;
  readonly attackPressed: boolean;
  readonly attackHeld: boolean;
  readonly dashPressed: boolean;
  readonly specialPressed: boolean;
  readonly specialHeld: boolean;
  readonly specialReleased: boolean;
  readonly pausePressed: boolean;
  readonly jumpPressedAt: number;
  readonly device: InputDevice;
  readonly gamepadKind: GamepadKind | null;
}

interface RawButtons {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
  attack: boolean;
  dash: boolean;
  special: boolean;
  pause: boolean;
  moveX: DigitalAxis;
  moveY: DigitalAxis;
}

interface PadRead extends RawButtons {
  deviceActive: boolean;
  kind: GamepadKind | null;
  stickMag: number;
}

const EMPTY_RAW: RawButtons = {
  left: false,
  right: false,
  up: false,
  down: false,
  jump: false,
  attack: false,
  dash: false,
  special: false,
  pause: false,
  moveX: 0,
  moveY: 0,
};

function emptyFrame(device: InputDevice): InputFrame {
  return Object.freeze({
    moveX: 0,
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
    device,
    gamepadKind: null,
  });
}

function digitalFromAxis(value: number, deadzone: number): DigitalAxis {
  if (value > deadzone) return 1;
  if (value < -deadzone) return -1;
  return 0;
}

function combineAxis(neg: boolean, pos: boolean): DigitalAxis {
  if (neg === pos) return 0;
  return neg ? -1 : 1;
}

function padButtonHeld(bindings: InputBindings, action: GameAction, pad: Gamepad): boolean {
  for (const index of bindings.gamepad[action]) {
    const button = pad.buttons[index];
    if (button !== undefined && button.pressed) return true;
  }
  return false;
}

function stickAxes(pad: Gamepad): { x: DigitalAxis; y: DigitalAxis; magnitude: number } {
  const x = pad.axes[0] ?? 0;
  const y = pad.axes[1] ?? 0;
  const magnitude = Math.hypot(x, y);
  if (magnitude <= ANALOG_DEADZONE) {
    return { x: 0, y: 0, magnitude };
  }
  return {
    x: digitalFromAxis(x, ANALOG_DEADZONE),
    y: digitalFromAxis(y, ANALOG_DEADZONE),
    magnitude,
  };
}

function toGamepadKind(vendor: GamepadAdapter.GlyphVendor): GamepadKind {
  if (vendor === 'xbox') return 'xbox';
  if (vendor === 'playstation') return 'playstation';
  return 'generic';
}

function anyKeyboardAction(bindings: InputBindings): boolean {
  for (const action of Object.keys(bindings.keyboard) as GameAction[]) {
    if (Keyboard.anyDown(bindings.keyboard[action])) return true;
  }
  return false;
}

function orRaw(a: RawButtons, b: RawButtons): RawButtons {
  const left = a.left || b.left;
  const right = a.right || b.right;
  const up = a.up || b.up;
  const down = a.down || b.down;
  return {
    left,
    right,
    up,
    down,
    jump: a.jump || b.jump,
    attack: a.attack || b.attack,
    dash: a.dash || b.dash,
    special: a.special || b.special,
    pause: a.pause || b.pause,
    moveX: combineAxis(left, right),
    moveY: combineAxis(up, down),
  };
}

function padMove(bindings: InputBindings, pad: Gamepad, stick: ReturnType<typeof stickAxes>) {
  const left = stick.x === -1 || padButtonHeld(bindings, 'left', pad);
  const right = stick.x === 1 || padButtonHeld(bindings, 'right', pad);
  const up = stick.y === -1 || padButtonHeld(bindings, 'up', pad);
  const down = stick.y === 1 || padButtonHeld(bindings, 'down', pad);
  return { left, right, up, down };
}

function padActions(bindings: InputBindings, pad: Gamepad) {
  return {
    jump: padButtonHeld(bindings, 'jump', pad),
    attack: padButtonHeld(bindings, 'attack', pad),
    dash: padButtonHeld(bindings, 'dash', pad),
    special: padButtonHeld(bindings, 'special', pad),
    pause: padButtonHeld(bindings, 'pause', pad),
  };
}

function readOnePad(bindings: InputBindings, pad: Gamepad): PadRead {
  const stick = stickAxes(pad);
  const move = padMove(bindings, pad, stick);
  const actions = padActions(bindings, pad);
  const anyButton =
    actions.jump ||
    actions.attack ||
    actions.dash ||
    actions.special ||
    actions.pause ||
    move.left ||
    move.right ||
    move.up ||
    move.down;
  return {
    ...move,
    ...actions,
    moveX: combineAxis(move.left, move.right),
    moveY: combineAxis(move.up, move.down),
    stickMag: stick.magnitude,
    deviceActive: anyButton || stick.magnitude > DEVICE_SWITCH_STICK,
    kind: toGamepadKind(GamepadAdapter.detectVendor(pad.id)),
  };
}

/**
 * Samples keyboard + gamepad every frame into an immutable {@link InputFrame}.
 * Position 1 in `SYSTEM_ORDER_GAMEPLAY` once T3 wires the registry.
 */
export class InputSystem implements System {
  readonly id = 'input';
  enabled = true;
  /** Pause UI still needs `pausePressed` / focus nav. */
  readonly runsWhilePaused = true;

  private bindings: InputBindings = DEFAULT_INPUT_BINDINGS;
  private prev: RawButtons = { ...EMPTY_RAW };
  private current: InputFrame = emptyFrame('keyboard');
  private lastDevice: InputDevice = 'keyboard';
  private lastGamepadKind: GamepadKind | null = null;
  private jumpPressedAt = 0;
  private _lastSampleAt = 0;

  /** Last built frame — never mutate. */
  get frame(): InputFrame {
    return this.current;
  }

  /** For latency instrumentation (Pillar 1). */
  get lastSampleAt(): number {
    return this._lastSampleAt;
  }

  setBindings(bindings: InputBindings): void {
    this.bindings = bindings;
  }

  init(): void {
    Keyboard.ensureListening();
  }

  update(time: number, delta: number): void {
    void time;
    void delta;
    this._lastSampleAt = now();
    const raw = this.sampleRaw();
    this.current = this.buildFrame(raw);
    this.prev = raw;
  }

  /** Clear edge-sensitive state after pause so queued attacks do not fire (docs/13 §5.3). */
  clearAfterUnpause(): void {
    this.prev = { ...EMPTY_RAW };
    this.current = emptyFrame(this.lastDevice);
  }

  destroy(): void {
    Keyboard.stopListening();
  }

  private buildFrame(raw: RawButtons): InputFrame {
    const jumpPressed = raw.jump && !this.prev.jump;
    if (jumpPressed) {
      const fromKey = Keyboard.earliestPressAt(this.bindings.keyboard.jump);
      this.jumpPressedAt = fromKey ?? this._lastSampleAt;
    }
    return Object.freeze({
      moveX: raw.moveX,
      moveY: raw.moveY,
      jumpPressed,
      jumpHeld: raw.jump,
      jumpReleased: !raw.jump && this.prev.jump,
      attackPressed: raw.attack && !this.prev.attack,
      attackHeld: raw.attack,
      dashPressed: raw.dash && !this.prev.dash,
      specialPressed: raw.special && !this.prev.special,
      specialHeld: raw.special,
      specialReleased: !raw.special && this.prev.special,
      pausePressed: raw.pause && !this.prev.pause,
      jumpPressedAt: this.jumpPressedAt,
      device: this.lastDevice,
      gamepadKind: this.lastGamepadKind,
    });
  }

  private sampleRaw(): RawButtons {
    const kb = this.readKeyboard();
    const gp = this.readGamepad();

    if (gp.deviceActive) {
      this.lastDevice = 'gamepad';
      this.lastGamepadKind = gp.kind;
    } else if (kb.active) {
      this.lastDevice = 'keyboard';
      this.lastGamepadKind = null;
    }

    return orRaw(kb, gp);
  }

  private readKeyboard(): RawButtons & { active: boolean } {
    const keys = this.bindings.keyboard;
    const left = Keyboard.anyDown(keys.left);
    const right = Keyboard.anyDown(keys.right);
    const up = Keyboard.anyDown(keys.up);
    const down = Keyboard.anyDown(keys.down);
    const jump = Keyboard.anyDown(keys.jump);
    const attack = Keyboard.anyDown(keys.attack);
    const dash = Keyboard.anyDown(keys.dash);
    const special = Keyboard.anyDown(keys.special);
    const pause = Keyboard.anyDown(keys.pause);
    return {
      left,
      right,
      up,
      down,
      jump,
      attack,
      dash,
      special,
      pause,
      moveX: combineAxis(left, right),
      moveY: combineAxis(up, down),
      active: anyKeyboardAction(this.bindings),
    };
  }

  private readGamepad(): PadRead {
    let acc: PadRead = {
      ...EMPTY_RAW,
      deviceActive: false,
      kind: null,
      stickMag: 0,
    };

    for (const pad of GamepadAdapter.pollGamepads()) {
      if (pad === null) continue;
      const one = readOnePad(this.bindings, pad);
      acc = {
        ...orRaw(acc, one),
        stickMag: Math.max(acc.stickMag, one.stickMag),
        deviceActive: acc.deviceActive || one.deviceActive,
        kind: one.kind,
      };
    }

    return acc;
  }
}

/** Exported for pillar latency helpers. */
export const INPUT_LATENCY_BUDGET_MS = BUDGET.FRAME_MS;
