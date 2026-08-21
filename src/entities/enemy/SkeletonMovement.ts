import type { SensorResult } from '@components/LedgeSensor';

/** Horizontal velocity (px/s) and the facing it implies for this frame. */
export interface MoveResult {
  readonly vx: number;
  readonly facing: -1 | 1;
}

/**
 * PATROL: walk at `moveSpeed` in the current facing, reversing on a wall or a
 * ledge ahead (docs/08 §6.1's "does not walk off a ledge" via §5.6 sensing). The
 * reversal frame itself holds still (vx 0) — simplest correct thing, and one
 * stalled frame at 60fps is imperceptible; walking the new direction resumes
 * next tick, never advancing further toward the hazard just detected.
 */
export function resolvePatrolVelocity(
  facing: -1 | 1,
  moveSpeed: number,
  sensor: SensorResult,
): MoveResult {
  if (sensor.wallAhead || sensor.ledgeAhead) {
    return { vx: 0, facing: facing === 1 ? -1 : 1 };
  }
  return { vx: moveSpeed * facing, facing };
}

/** CHASE: move straight at the target's x at `chaseSpeed`, facing it. */
export function resolveChaseVelocity(
  selfX: number,
  targetX: number,
  chaseSpeed: number,
): MoveResult {
  const facing: -1 | 1 = targetX >= selfX ? 1 : -1;
  return { vx: chaseSpeed * facing, facing };
}
