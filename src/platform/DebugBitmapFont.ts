/**
 * Tiny runtime bitmap font for M1 debug/labels (full font atlas is M3).
 * Canvas lives in platform — browser APIs stay out of scenes.
 */
import type Phaser from 'phaser';

export const DEBUG_FONT_KEY = 'debug';

const GW = 4;
const GH = 6;
const FIRST = 32;
const LAST = 126;

/** 3×5 strokes in a 4×6 cell — enough for ASCII debug strings. */
const PATTERNS: Readonly<Record<string, readonly string[]>> = {
  ' ': ['....', '....', '....', '....', '....'],
  '-': ['....', '....', '###.', '....', '....'],
  '.': ['....', '....', '....', '....', '.#..'],
  ':': ['....', '.#..', '....', '.#..', '....'],
  '/': ['..#.', '..#.', '.#..', '.#..', '#...'],
  '0': ['###.', '#.#.', '#.#.', '#.#.', '###.'],
  '1': ['##..', '.#..', '.#..', '.#..', '###.'],
  '2': ['###.', '..#.', '###.', '#...', '###.'],
  '3': ['###.', '..#.', '###.', '..#.', '###.'],
  '4': ['#.#.', '#.#.', '###.', '..#.', '..#.'],
  '5': ['###.', '#...', '###.', '..#.', '###.'],
  '6': ['###.', '#...', '###.', '#.#.', '###.'],
  '7': ['###.', '..#.', '..#.', '.#..', '.#..'],
  '8': ['###.', '#.#.', '###.', '#.#.', '###.'],
  '9': ['###.', '#.#.', '###.', '..#.', '###.'],
  A: ['###.', '#.#.', '###.', '#.#.', '#.#.'],
  B: ['##..', '#.#.', '##..', '#.#.', '##..'],
  C: ['###.', '#...', '#...', '#...', '###.'],
  D: ['##..', '#.#.', '#.#.', '#.#.', '##..'],
  E: ['###.', '#...', '###.', '#...', '###.'],
  F: ['###.', '#...', '###.', '#...', '#...'],
  G: ['###.', '#...', '#.#.', '#.#.', '###.'],
  H: ['#.#.', '#.#.', '###.', '#.#.', '#.#.'],
  I: ['###.', '.#..', '.#..', '.#..', '###.'],
  J: ['###.', '..#.', '..#.', '#.#.', '###.'],
  K: ['#.#.', '#.#.', '##..', '#.#.', '#.#.'],
  L: ['#...', '#...', '#...', '#...', '###.'],
  M: ['#.#.', '###.', '#.#.', '#.#.', '#.#.'],
  N: ['#.#.', '###.', '###.', '#.#.', '#.#.'],
  O: ['###.', '#.#.', '#.#.', '#.#.', '###.'],
  P: ['###.', '#.#.', '###.', '#...', '#...'],
  Q: ['###.', '#.#.', '#.#.', '###.', '..#.'],
  R: ['###.', '#.#.', '##..', '#.#.', '#.#.'],
  S: ['###.', '#...', '###.', '..#.', '###.'],
  T: ['###.', '.#..', '.#..', '.#..', '.#..'],
  U: ['#.#.', '#.#.', '#.#.', '#.#.', '###.'],
  V: ['#.#.', '#.#.', '#.#.', '#.#.', '.#..'],
  W: ['#.#.', '#.#.', '#.#.', '###.', '#.#.'],
  X: ['#.#.', '#.#.', '.#..', '#.#.', '#.#.'],
  Y: ['#.#.', '#.#.', '###.', '.#..', '.#..'],
  Z: ['###.', '..#.', '.#..', '#...', '###.'],
  _: ['....', '....', '....', '....', '###.'],
};

function patternFor(ch: string): readonly string[] {
  const key = ch === '_' ? '_' : ch.toUpperCase();
  return PATTERNS[key] ?? PATTERNS['.']!;
}

export function installDebugBitmapFont(scene: Phaser.Scene): void {
  if (scene.cache.bitmapFont.exists(DEBUG_FONT_KEY)) return;

  const count = LAST - FIRST + 1;
  const texW = count * GW;
  const texH = GH;
  const canvasTex = scene.textures.createCanvas(DEBUG_FONT_KEY, texW, texH);
  if (canvasTex === null) {
    throw new Error('Failed to create debug font canvas');
  }
  const ctx = canvasTex.getContext();
  ctx.clearRect(0, 0, texW, texH);
  ctx.fillStyle = '#ffffff';

  const chars: Record<number, Phaser.Types.GameObjects.BitmapText.BitmapFontCharacterData> = {};

  for (let code = FIRST; code <= LAST; code++) {
    const ch = String.fromCharCode(code);
    const col = code - FIRST;
    const ox = col * GW;
    const rows = patternFor(ch);
    for (let y = 0; y < rows.length; y++) {
      const row = rows[y]!;
      for (let x = 0; x < row.length; x++) {
        if (row[x] === '#') {
          ctx.fillRect(ox + x, y, 1, 1);
        }
      }
    }
    chars[code] = {
      x: ox,
      y: 0,
      width: GW,
      height: GH,
      centerX: GW / 2,
      centerY: GH / 2,
      xOffset: 0,
      yOffset: 0,
      xAdvance: GW,
      data: {},
      kerning: {},
      u0: ox / texW,
      v0: 0,
      u1: (ox + GW) / texW,
      v1: 1,
    } as unknown as Phaser.Types.GameObjects.BitmapText.BitmapFontCharacterData;
  }

  canvasTex.refresh();

  scene.cache.bitmapFont.add(DEBUG_FONT_KEY, {
    data: {
      font: DEBUG_FONT_KEY,
      size: GH,
      lineHeight: GH + 1,
      chars,
    },
    texture: DEBUG_FONT_KEY,
    frame: undefined,
  });
}
