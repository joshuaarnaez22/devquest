import type { GamepadKind } from '@config/InputMap';

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

/** Anything that exposes the current frame (e.g. InputSystem). */
export interface InputFrameSource {
  readonly frame: InputFrame;
}
