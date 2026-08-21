import { describe, expect, it } from 'vitest';
import { HitFlash, lerpColour } from '@components/HitFlash';

describe('lerpColour', () => {
  it('t=1 returns the target colour exactly', () => {
    expect(lerpColour(0x000000, 0xf2f0f5, 1)).toBe(0xf2f0f5);
  });
  it('t=0 returns the source colour exactly', () => {
    expect(lerpColour(0x000000, 0xf2f0f5, 0)).toBe(0x000000);
  });
  it('interpolates channel-wise at the midpoint', () => {
    expect(lerpColour(0x000000, 0x646464, 0.5)).toBe(0x323232); // 100/2=50=0x32
  });
});

describe('HitFlash (§6.3)', () => {
  it('is inactive before the first start()', () => {
    const flash = new HitFlash();
    expect(flash.active).toBe(false);
    expect(flash.currentColour()).toBeNull();
  });

  it('holds the full colour for the whole flashMs window', () => {
    const flash = new HitFlash();
    flash.start(0xf2f0f5, 80);
    expect(flash.currentColour()).toBe(0xf2f0f5);
    flash.update(79);
    expect(flash.currentColour()).toBe(0xf2f0f5);
  });

  it('fades toward black over the 40ms window after flashMs', () => {
    const flash = new HitFlash();
    flash.start(0xf2f0f5, 80);
    flash.update(80); // exactly at the hold/fade boundary
    expect(flash.currentColour()).toBe(0xf2f0f5); // v=1, still full colour

    flash.update(20); // halfway through the 40ms fade
    expect(flash.currentColour()).toBe(lerpColour(0x000000, 0xf2f0f5, 0.5));

    flash.update(20); // fade window fully elapsed (80 + 40)
    expect(flash.active).toBe(false);
    expect(flash.currentColour()).toBeNull(); // caller clears tint entirely
  });

  it('uses the fatal colour when started with it, independent of the fade math', () => {
    const flash = new HitFlash();
    flash.start(0xffffff, 80);
    expect(flash.currentColour()).toBe(0xffffff);
  });

  it('a fresh start() while still fading restarts the hold from full colour', () => {
    const flash = new HitFlash();
    flash.start(0xf2f0f5, 80);
    flash.update(100); // into the fade
    flash.start(0xffffff, 80); // a second hit lands mid-fade
    expect(flash.currentColour()).toBe(0xffffff);
    expect(flash.active).toBe(true);
  });

  it('update before start() is a no-op, not a crash', () => {
    const flash = new HitFlash();
    expect(() => flash.update(16.67)).not.toThrow();
    expect(flash.active).toBe(false);
  });
});
