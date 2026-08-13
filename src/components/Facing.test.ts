import { describe, expect, it } from 'vitest';
import { Facing } from '@components/Facing';

describe('Facing (§5, §6.4)', () => {
  it('defaults to right', () => {
    const f = new Facing();
    expect(f.value).toBe(1);
    expect(f.isLeft).toBe(false);
  });

  it('follows non-zero move input', () => {
    const f = new Facing();
    f.fromMove(-1);
    expect(f.value).toBe(-1);
    expect(f.isLeft).toBe(true);
    f.fromMove(1);
    expect(f.value).toBe(1);
  });

  it('keeps current facing when move is 0 (no snap to default)', () => {
    const f = new Facing(-1);
    f.fromMove(0);
    expect(f.value).toBe(-1);
  });

  it('flip toggles direction', () => {
    const f = new Facing(1);
    f.flip();
    expect(f.value).toBe(-1);
    f.flip();
    expect(f.value).toBe(1);
  });
});
