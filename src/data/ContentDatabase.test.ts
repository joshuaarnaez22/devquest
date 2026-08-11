import { describe, expect, it } from 'vitest';
import { CHARACTER_IDS } from '@data/CharacterTypes';
import { ContentDatabase } from '@data/ContentDatabase';
import { NINJA_MOVEMENT, SAMURAI_MOVEMENT } from '@entities/player/CharacterMovement';

describe('ContentDatabase', () => {
  it('loads and validates all four heroes', () => {
    const result = ContentDatabase.create();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.validateAll().ok).toBe(true);
    for (const id of CHARACTER_IDS) {
      expect(result.value.character(id).id).toBe(id);
    }
  });

  it('samurai movement matches SAMURAI_MOVEMENT constant', () => {
    const result = ContentDatabase.create();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.character('samurai').movement).toEqual(SAMURAI_MOVEMENT);
  });

  it('ninja movement matches NINJA_MOVEMENT constant', () => {
    const result = ContentDatabase.create();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.character('ninja').movement).toEqual(NINJA_MOVEMENT);
  });

  it('ninja has one air jump and i-frame dash', () => {
    const result = ContentDatabase.create();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ninja = result.value.character('ninja').movement;
    expect(ninja.airJumps).toBe(1);
    expect(ninja.dashIFrames).toBe(true);
    expect(ninja.dashIFrameGraceMs).toBe(80);
  });

  it('knight movement matches docs/06-Characters.md §5.2', () => {
    const result = ContentDatabase.create();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.character('knight').movement).toMatchObject({
      runSpeed: 78,
      groundAccel: 700,
      groundDecel: 900,
      airAccel: 420,
      airDecel: 280,
      jumpVelocity: -230,
      airJumps: 0,
      dashSpeed: 210,
      dashDurationMs: 140,
      dashCooldownMs: 700,
      dashIFrames: false,
      wallSlideSpeed: 90,
    });
  });

  it('wizard movement matches docs/06-Characters.md §5.2', () => {
    const result = ContentDatabase.create();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.character('wizard').movement).toMatchObject({
      runSpeed: 82,
      groundAccel: 820,
      groundDecel: 1100,
      airAccel: 560,
      airDecel: 380,
      jumpVelocity: -232,
      airJumps: 0,
      dashSpeed: 240,
      dashDurationMs: 150,
      dashCooldownMs: 600,
      dashIFrames: false,
      wallSlideSpeed: 80,
    });
  });

  it('all four heroes are movement-distinguishable (M1 exit gate)', () => {
    const result = ContentDatabase.create();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const signatures = CHARACTER_IDS.map(id => {
      const m = result.value.character(id).movement;
      return `${m.runSpeed}|${m.jumpVelocity}|${m.dashSpeed}|${m.wallSlideSpeed}`;
    });
    expect(new Set(signatures).size).toBe(CHARACTER_IDS.length);
  });
});
