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
});
