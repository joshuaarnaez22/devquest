import { describe, expect, it } from 'vitest';
import { Hitbox } from '@components/Hitbox';
import { AttackScheduler } from '@entities/player/AttackScheduler';
import { SAMURAI_COMBO } from '@entities/player/CharacterCombat';

const FRAME = 1000 / 60; // 16.67 ms

describe('AttackScheduler — hitbox activates at windupMs ±1 frame (§11.2)', () => {
  it('schedules the hitbox active window exactly from the step timings', () => {
    const step = SAMURAI_COMBO[0];
    expect(step).toBeDefined();
    if (!step) return;
    const sched = new AttackScheduler();
    const hb = new Hitbox();
    const t0 = 1000;
    sched.begin(step, t0, hb);

    expect(hb.update(t0 + step.windupMs - FRAME)).toBe(false); // one frame before → windup
    expect(hb.update(t0 + step.windupMs)).toBe(true); // active at windupMs
    expect(hb.update(t0 + step.windupMs + step.activeMs - 1)).toBe(true); // last active ms
    expect(hb.update(t0 + step.windupMs + step.activeMs)).toBe(false); // window closed
  });

  it('opens the combo window at the end of active frames for comboWindowMs', () => {
    const step = SAMURAI_COMBO[0];
    expect(step).toBeDefined();
    if (!step) return;
    const sched = new AttackScheduler();
    sched.begin(step, 0, new Hitbox());
    const openAt = step.windupMs + step.activeMs;
    expect(sched.comboWindowOpen(openAt - 1)).toBe(false);
    expect(sched.comboWindowOpen(openAt)).toBe(true);
    expect(sched.comboWindowOpen(openAt + step.comboWindowMs - 1)).toBe(true);
    expect(sched.comboWindowOpen(openAt + step.comboWindowMs)).toBe(false);
  });

  it('completes only after windup + active + recovery', () => {
    const step = SAMURAI_COMBO[0];
    expect(step).toBeDefined();
    if (!step) return;
    const sched = new AttackScheduler();
    sched.begin(step, 0, new Hitbox());
    const total = step.windupMs + step.activeMs + step.recoveryMs;
    expect(sched.animComplete(total - 1)).toBe(false);
    expect(sched.animComplete(total)).toBe(true);
  });

  it('is idle before begin and after end', () => {
    const step = SAMURAI_COMBO[0];
    expect(step).toBeDefined();
    if (!step) return;
    const sched = new AttackScheduler();
    expect(sched.active).toBe(false);
    expect(sched.comboWindowOpen(0)).toBe(false);
    expect(sched.animComplete(0)).toBe(false);

    sched.begin(step, 0, new Hitbox());
    expect(sched.active).toBe(true);
    expect(sched.current).toBe(step);

    sched.end();
    expect(sched.active).toBe(false);
    expect(sched.current).toBeNull();
  });

  it('re-begin restarts the phase clock (next combo hit)', () => {
    const step1 = SAMURAI_COMBO[0];
    const step2 = SAMURAI_COMBO[1];
    expect(step1 && step2).toBeTruthy();
    if (!step1 || !step2) return;
    const sched = new AttackScheduler();
    const hb = new Hitbox();
    sched.begin(step1, 0, hb);
    sched.begin(step2, 500, hb); // second hit starts fresh at t=500
    expect(hb.update(500 + step2.windupMs - FRAME)).toBe(false);
    expect(hb.update(500 + step2.windupMs)).toBe(true);
  });
});
