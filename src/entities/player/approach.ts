/** Move `current` toward `target` by at most `maxDelta` (always positive). */
export function approach(current: number, target: number, maxDelta: number): number {
  if (maxDelta < 0) {
    throw new Error('approach maxDelta must be >= 0');
  }
  if (current < target) return Math.min(current + maxDelta, target);
  if (current > target) return Math.max(current - maxDelta, target);
  return target;
}
