import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { Palette } from '@config/Palette';
import { SKELETON_STATE_TINT, SkeletonAnimator } from '@entities/enemy/SkeletonAnimator';
import type { SkeletonSnapshot } from '@entities/enemy/SkeletonAnimator';

function makeSprite() {
  return {
    tint: 0,
    flipX: false,
    setTintFill(color: number) {
      this.tint = color;
      return this;
    },
    setFlipX(value: boolean) {
      this.flipX = value;
      return this;
    },
  };
}

describe('SkeletonAnimator', () => {
  it('tints the sprite per FSM state, WINDUP loudest', () => {
    const sprite = makeSprite();
    const anim = new SkeletonAnimator(sprite);
    const snap = (state: SkeletonSnapshot['state']): SkeletonSnapshot =>
      Object.freeze({ state, facing: 1 as const });

    anim.update(snap('IDLE'));
    expect(sprite.tint).toBe(SKELETON_STATE_TINT.IDLE);

    anim.update(snap('WINDUP'));
    expect(sprite.tint).toBe(Palette.S1);

    anim.update(snap('DEATH'));
    expect(sprite.tint).toBe(SKELETON_STATE_TINT.DEATH);
  });

  it('flips from facing without touching body', () => {
    const sprite = makeSprite();
    const anim = new SkeletonAnimator(sprite);
    anim.update(Object.freeze({ state: 'IDLE' as const, facing: -1 as const }));
    expect(sprite.flipX).toBe(true);
    anim.update(Object.freeze({ state: 'IDLE' as const, facing: 1 as const }));
    expect(sprite.flipX).toBe(false);
  });

  it('flashColour overrides the state tint while set', () => {
    const sprite = makeSprite();
    const anim = new SkeletonAnimator(sprite);
    anim.update(
      Object.freeze({ state: 'PATROL' as const, facing: 1 as const, flashColour: 0xffffff }),
    );
    expect(sprite.tint).toBe(0xffffff);
    anim.update(Object.freeze({ state: 'PATROL' as const, facing: 1 as const, flashColour: null }));
    expect(sprite.tint).toBe(SKELETON_STATE_TINT.PATROL);
  });

  it('source file never references .body (Pillar 1)', () => {
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'SkeletonAnimator.ts'),
      'utf8',
    );
    expect(src.includes('.body')).toBe(false);
  });
});
