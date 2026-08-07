import { now } from '@platform/Clock';

/**
 * Keyboard sampling — browser listeners live only here (docs/03 §14.2).
 * Codes are `KeyboardEvent.code` values (see InputMap).
 */

const down = new Set<string>();
const pressedAt = new Map<string, number>();
let listening = false;

function onKeyDown(ev: KeyboardEvent): void {
  if (ev.repeat) return;
  if (!down.has(ev.code)) {
    pressedAt.set(ev.code, now());
  }
  down.add(ev.code);
}

function onKeyUp(ev: KeyboardEvent): void {
  down.delete(ev.code);
}

export function ensureListening(): void {
  if (listening) return;
  if (typeof window === 'undefined') return;
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  listening = true;
}

export function stopListening(): void {
  if (!listening) return;
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  }
  listening = false;
}

export function isDown(code: string): boolean {
  return down.has(code);
}

export function anyDown(codes: readonly string[]): boolean {
  for (const code of codes) {
    if (down.has(code)) return true;
  }
  return false;
}

/** Earliest press timestamp among currently held codes in `codes`, or undefined. */
export function earliestPressAt(codes: readonly string[]): number | undefined {
  let best: number | undefined;
  for (const code of codes) {
    if (!down.has(code)) continue;
    const t = pressedAt.get(code);
    if (t === undefined) continue;
    if (best === undefined || t < best) best = t;
  }
  return best;
}

/** Test-only: set a key down at an absolute clock time. */
export function __press(code: string, at = now()): void {
  if (!down.has(code)) {
    pressedAt.set(code, at);
  }
  down.add(code);
}

/** Test-only: release a key. */
export function __release(code: string): void {
  down.delete(code);
}

/** Test-only: clear all keys and listeners flag (does not detach if never attached). */
export function __reset(): void {
  down.clear();
  pressedAt.clear();
}
