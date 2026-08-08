import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { afterEach, describe, expect, it } from 'vitest';
import { Palette } from '@config/Palette';
import { PlayerAnimator, STATE_TINT } from '@entities/player/PlayerAnimator';
import type { PlayerSnapshot } from '@entities/player/PlayerSnapshot';

function makeSprite() {
  return {
    tint: 0,
    flipX: false,
    setTint(color?: number) {
      if (color !== undefined) this.tint = color;
      return this;
    },
    clearTint() {
      this.tint = 0xffffff;
      return this;
    },
    setFlipX(value: boolean) {
      this.flipX = value;
      return this;
    },
  };
}

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const probePath = join(repoRoot, 'src/entities/player/_LintProbeAnimator.ts');

afterEach(() => {
  try {
    unlinkSync(probePath);
  } catch {
    /* probe may not exist */
  }
});

describe('PlayerAnimator', () => {
  it('tints the sprite per FSM state', () => {
    const sprite = makeSprite();
    const anim = new PlayerAnimator(sprite);
    const snap = (state: PlayerSnapshot['state']): PlayerSnapshot =>
      Object.freeze({ state, facing: 1 as const, animPrefix: 'samurai' });

    anim.update(snap('IDLE'));
    expect(sprite.tint).toBe(Palette.N5);

    anim.update(snap('JUMP'));
    expect(sprite.tint).toBe(STATE_TINT.JUMP);

    anim.update(snap('FALL'));
    expect(sprite.tint).toBe(STATE_TINT.FALL);

    anim.update(snap('RUN'));
    expect(sprite.tint).toBe(STATE_TINT.RUN);
  });

  it('flips from facing without touching body', () => {
    const sprite = makeSprite();
    const anim = new PlayerAnimator(sprite);
    anim.update(
      Object.freeze({ state: 'IDLE' as const, facing: -1 as const, animPrefix: 'samurai' }),
    );
    expect(sprite.flipX).toBe(true);
    anim.update(
      Object.freeze({ state: 'IDLE' as const, facing: 1 as const, animPrefix: 'samurai' }),
    );
    expect(sprite.flipX).toBe(false);
  });

  it('source file never references .body', () => {
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'PlayerAnimator.ts'),
      'utf8',
    );
    expect(src.includes('.body')).toBe(false);
  });

  it('ESLint forbids snap.body in *Animator.ts (Pillar 1)', async () => {
    writeFileSync(
      probePath,
      `
export class PlayerAnimator {
  update(snap: { body: unknown }): void {
    void snap.body;
  }
}
`,
    );
    const eslint = new ESLint({ cwd: repoRoot });
    const results = await eslint.lintFiles([probePath]);
    const messages = results[0]?.messages ?? [];
    expect(messages.some(m => /read-only projections of state/i.test(m.message))).toBe(true);
  }, 20_000);
});
