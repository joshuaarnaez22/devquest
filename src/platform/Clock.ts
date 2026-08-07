/** Mockable clock — every timing test depends on this (docs/M0-T15). */

let offsetMs = 0;

export function now(): number {
  return performance.now() + offsetMs;
}

/** Test-only: shift the clock without touching performance.now. */
export function __setOffsetMs(ms: number): void {
  offsetMs = ms;
}

export function __resetOffset(): void {
  offsetMs = 0;
}
