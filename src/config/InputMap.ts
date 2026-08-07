/** Default bindings and analog thresholds — docs/13-UI-UX.md §5.1 / §5.3 / §5.4. */

export type GameAction =
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'jump'
  | 'attack'
  | 'dash'
  | 'special'
  | 'pause';

export type GamepadKind = 'xbox' | 'playstation' | 'generic';

export interface InputBindings {
  readonly keyboard: Readonly<Record<GameAction, readonly string[]>>;
  readonly gamepad: Readonly<Record<GameAction, readonly number[]>>;
  readonly gamepadAxes: {
    readonly moveX: { readonly axis: number; readonly deadzone: number };
    readonly moveY: { readonly axis: number; readonly deadzone: number };
  };
}

/** Radial stick deadzone before any axis is read as digital. */
export const ANALOG_DEADZONE = 0.3;

/** Stick magnitude that counts as intentional device activity. */
export const DEVICE_SWITCH_STICK = 0.5;

/**
 * Standard gamepad indices (W3C / Xbox layout).
 * Jump A=0, Dash B=1, Attack X=2, Special Y=3, RT=7, Start=9,
 * D-pad 12–15.
 */
export const DEFAULT_INPUT_BINDINGS: InputBindings = {
  keyboard: {
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    up: ['KeyW', 'ArrowUp'],
    down: ['KeyS', 'ArrowDown'],
    jump: ['Space', 'KeyW', 'ArrowUp'],
    attack: ['KeyJ'],
    dash: ['KeyK', 'ShiftLeft', 'ShiftRight'],
    special: ['KeyL', 'KeyE'],
    pause: ['Escape'],
  },
  gamepad: {
    left: [14],
    right: [15],
    up: [12],
    down: [13],
    jump: [0],
    attack: [2],
    dash: [1, 7],
    special: [3],
    pause: [9],
  },
  gamepadAxes: {
    moveX: { axis: 0, deadzone: ANALOG_DEADZONE },
    moveY: { axis: 1, deadzone: ANALOG_DEADZONE },
  },
};
