import { describe, expect, it } from 'vitest';
import { Flinch } from '@components/Flinch';

describe('Flinch — poise-intact stagger reaction (§6.7)', () => {
  it('is inactive before the first start()', () => {
    const flinch = new Flinch();
    expect(flinch.active).toBe(false);
  });

  it('is active for exactly 100ms after start()', () => {
    const flinch = new Flinch();
    flinch.start();
    expect(flinch.active).toBe(true);
    flinch.update(99);
    expect(flinch.active).toBe(true);
    flinch.update(1);
    expect(flinch.active).toBe(false);
  });

  it('a fresh start() while still flinching restarts the window', () => {
    const flinch = new Flinch();
    flinch.start();
    flinch.update(90);
    flinch.start(); // a second light hit lands mid-flinch
    flinch.update(90);
    expect(flinch.active).toBe(true); // 90ms into the NEW window, not 180ms into the old
  });

  it('update after expiry is a no-op, not a crash', () => {
    const flinch = new Flinch();
    flinch.start();
    flinch.update(200);
    expect(() => flinch.update(16.67)).not.toThrow();
    expect(flinch.active).toBe(false);
  });
});
