/**
 * Readable M1 debug bitmap font (5×7 in a 6×8 cell).
 * Full production font atlas is M3 — this is for overlays only.
 */
import type Phaser from 'phaser';

export const DEBUG_FONT_KEY = 'debug';
/** Native glyph height — BitmapText `size` must be this (or an integer multiple). */
export const DEBUG_FONT_SIZE = 8;

const GW = 6;
const GH = DEBUG_FONT_SIZE;
const FIRST = 32;
const LAST = 126;

/** 5×7 ink in a 6×8 cell — one column of padding for letter spacing. */
const PATTERNS: Readonly<Record<string, readonly string[]>> = {
  ' ': ['......', '......', '......', '......', '......', '......', '......'],
  '!': ['..#...', '..#...', '..#...', '..#...', '..#...', '......', '..#...'],
  '#': ['.#.#..', '.#.#..', '#####.', '.#.#..', '#####.', '.#.#..', '.#.#..'],
  '%': ['##..#.', '##.#..', '..#...', '.#....', '..#...', '.#.##.', '#..##.'],
  '(': ['..#...', '.#....', '.#....', '.#....', '.#....', '.#....', '..#...'],
  ')': ['..#...', '...#..', '...#..', '...#..', '...#..', '...#..', '..#...'],
  '+': ['......', '..#...', '..#...', '#####.', '..#...', '..#...', '......'],
  '-': ['......', '......', '......', '#####.', '......', '......', '......'],
  '.': ['......', '......', '......', '......', '......', '......', '..#...'],
  '/': ['....#.', '...#..', '..#...', '.#....', '#.....', '......', '......'],
  '0': ['.###..', '#...#.', '#..##.', '#.#.#.', '##..#.', '#...#.', '.###..'],
  '1': ['..#...', '.##...', '..#...', '..#...', '..#...', '..#...', '.###..'],
  '2': ['.###..', '#...#.', '....#.', '..##..', '.#....', '#.....', '#####.'],
  '3': ['.###..', '#...#.', '....#.', '..##..', '....#.', '#...#.', '.###..'],
  '4': ['...#..', '..##..', '.#.#..', '#..#..', '#####.', '...#..', '...#..'],
  '5': ['#####.', '#.....', '####..', '....#.', '....#.', '#...#.', '.###..'],
  '6': ['.###..', '#.....', '#.....', '####..', '#...#.', '#...#.', '.###..'],
  '7': ['#####.', '....#.', '...#..', '..#...', '.#....', '.#....', '.#....'],
  '8': ['.###..', '#...#.', '#...#.', '.###..', '#...#.', '#...#.', '.###..'],
  '9': ['.###..', '#...#.', '#...#.', '.####.', '....#.', '....#.', '.###..'],
  ':': ['......', '..#...', '......', '......', '......', '..#...', '......'],
  '=': ['......', '......', '#####.', '......', '#####.', '......', '......'],
  A: ['.###..', '#...#.', '#...#.', '#####.', '#...#.', '#...#.', '#...#.'],
  B: ['####..', '#...#.', '#...#.', '####..', '#...#.', '#...#.', '####..'],
  C: ['.###..', '#...#.', '#.....', '#.....', '#.....', '#...#.', '.###..'],
  D: ['####..', '#...#.', '#...#.', '#...#.', '#...#.', '#...#.', '####..'],
  E: ['#####.', '#.....', '#.....', '####..', '#.....', '#.....', '#####.'],
  F: ['#####.', '#.....', '#.....', '####..', '#.....', '#.....', '#.....'],
  G: ['.###..', '#...#.', '#.....', '#.###.', '#...#.', '#...#.', '.###..'],
  H: ['#...#.', '#...#.', '#...#.', '#####.', '#...#.', '#...#.', '#...#.'],
  I: ['.###..', '..#...', '..#...', '..#...', '..#...', '..#...', '.###..'],
  J: ['..###.', '...#..', '...#..', '...#..', '...#..', '#..#..', '.##...'],
  K: ['#...#.', '#..#..', '#.#...', '##....', '#.#...', '#..#..', '#...#.'],
  L: ['#.....', '#.....', '#.....', '#.....', '#.....', '#.....', '#####.'],
  M: ['#...#.', '##.##.', '#.#.#.', '#...#.', '#...#.', '#...#.', '#...#.'],
  N: ['#...#.', '##..#.', '#.#.#.', '#..##.', '#...#.', '#...#.', '#...#.'],
  O: ['.###..', '#...#.', '#...#.', '#...#.', '#...#.', '#...#.', '.###..'],
  P: ['####..', '#...#.', '#...#.', '####..', '#.....', '#.....', '#.....'],
  Q: ['.###..', '#...#.', '#...#.', '#...#.', '#.#.#.', '#..#..', '.##.#.'],
  R: ['####..', '#...#.', '#...#.', '####..', '#.#...', '#..#..', '#...#.'],
  S: ['.###..', '#...#.', '#.....', '.###..', '....#.', '#...#.', '.###..'],
  T: ['#####.', '..#...', '..#...', '..#...', '..#...', '..#...', '..#...'],
  U: ['#...#.', '#...#.', '#...#.', '#...#.', '#...#.', '#...#.', '.###..'],
  V: ['#...#.', '#...#.', '#...#.', '#...#.', '#...#.', '.#.#..', '..#...'],
  W: ['#...#.', '#...#.', '#...#.', '#.#.#.', '#.#.#.', '#.#.#.', '.#.#..'],
  X: ['#...#.', '#...#.', '.#.#..', '..#...', '.#.#..', '#...#.', '#...#.'],
  Y: ['#...#.', '#...#.', '.#.#..', '..#...', '..#...', '..#...', '..#...'],
  Z: ['#####.', '....#.', '...#..', '..#...', '.#....', '#.....', '#####.'],
  _: ['......', '......', '......', '......', '......', '......', '#####.'],
};

function patternFor(ch: string): readonly string[] {
  const direct = PATTERNS[ch];
  if (direct !== undefined) return direct;
  const upper = PATTERNS[ch.toUpperCase()];
  if (upper !== undefined) return upper;
  return PATTERNS['.']!;
}

/**
 * Idempotent — multiple callers in the same scene (`GameScene` itself,
 * `DamageNumberSystem`) each call this defensively. Regenerating unconditionally
 * used to destroy-and-recreate the shared texture on every call, leaving any
 * `BitmapText` already created against the old `Frame` pointing at a dead texture
 * (`Frame.glTexture` null, crashing `WebGLRenderer.render` on the next draw) — the
 * font's pixels never change, so re-drawing them on a second call has no purpose.
 */
export function installDebugBitmapFont(scene: Phaser.Scene): void {
  if (scene.cache.bitmapFont.exists(DEBUG_FONT_KEY) && scene.textures.exists(DEBUG_FONT_KEY)) {
    return;
  }
  if (scene.cache.bitmapFont.exists(DEBUG_FONT_KEY)) {
    scene.cache.bitmapFont.remove(DEBUG_FONT_KEY);
  }
  if (scene.textures.exists(DEBUG_FONT_KEY)) {
    scene.textures.remove(DEBUG_FONT_KEY);
  }

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
      for (let x = 0; x < row.length && x < GW; x++) {
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
      lineHeight: GH,
      chars,
    },
    texture: DEBUG_FONT_KEY,
    frame: undefined,
  });
}
