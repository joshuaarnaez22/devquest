import { describe, expect, it } from 'vitest';
import { resolveChaseVelocity, resolvePatrolVelocity } from '@entities/enemy/SkeletonMovement';
import type { SensorResult } from '@components/LedgeSensor';

const CLEAR: SensorResult = { wallAhead: false, ledgeAhead: false, gapWidth: 0 };
const WALL: SensorResult = { wallAhead: true, ledgeAhead: false, gapWidth: 0 };
const LEDGE: SensorResult = { wallAhead: false, ledgeAhead: true, gapWidth: 32 };

describe('resolvePatrolVelocity', () => {
  it('walks forward at moveSpeed when the path ahead is clear', () => {
    expect(resolvePatrolVelocity(1, 34, CLEAR)).toEqual({ vx: 34, facing: 1 });
    expect(resolvePatrolVelocity(-1, 34, CLEAR)).toEqual({ vx: -34, facing: -1 });
  });

  it('reverses facing and holds still for the frame a ledge is detected', () => {
    expect(resolvePatrolVelocity(1, 34, LEDGE)).toEqual({ vx: 0, facing: -1 });
  });

  it('reverses facing and holds still for the frame a wall is detected', () => {
    expect(resolvePatrolVelocity(-1, 34, WALL)).toEqual({ vx: 0, facing: 1 });
  });

  it('resumes walking the new direction the frame after a reversal', () => {
    const reversal = resolvePatrolVelocity(1, 34, LEDGE);
    const next = resolvePatrolVelocity(reversal.facing, 34, CLEAR);
    expect(next).toEqual({ vx: -34, facing: -1 });
  });
});

describe('resolveChaseVelocity', () => {
  it('moves right and faces right when the target is to the right', () => {
    expect(resolveChaseVelocity(0, 50, 52)).toEqual({ vx: 52, facing: 1 });
  });

  it('moves left and faces left when the target is to the left', () => {
    expect(resolveChaseVelocity(50, 0, 52)).toEqual({ vx: -52, facing: -1 });
  });

  it('treats an exact match as facing right (>=)', () => {
    expect(resolveChaseVelocity(20, 20, 52)).toEqual({ vx: 52, facing: 1 });
  });
});
