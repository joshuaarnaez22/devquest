import { describe, expect, it } from 'vitest';
import { DEBUG_FONT_KEY, installDebugBitmapFont } from '@platform/DebugBitmapFont';

/**
 * Minimal fake `Phaser.Scene` — just the `cache.bitmapFont`/`textures` surface
 * `installDebugBitmapFont` touches. Not a real Phaser scene; this is a structural
 * stub, not a test of Phaser internals (docs/16 §"do not test Phaser internals").
 */
function makeFakeScene() {
  const bitmapFontKeys = new Set<string>();
  const textureKeys = new Set<string>();
  let createCanvasCalls = 0;
  let removeTextureCalls = 0;
  let removeFontCalls = 0;

  const fakeCanvasTexture = {
    getContext: () => ({
      clearRect: () => undefined,
      fillRect: () => undefined,
      set fillStyle(_v: string) {
        /* no-op */
      },
    }),
    refresh: () => undefined,
  };

  const scene = {
    cache: {
      bitmapFont: {
        exists: (key: string) => bitmapFontKeys.has(key),
        remove: (key: string) => {
          removeFontCalls++;
          bitmapFontKeys.delete(key);
        },
        add: (key: string) => {
          bitmapFontKeys.add(key);
        },
      },
    },
    textures: {
      exists: (key: string) => textureKeys.has(key),
      remove: (key: string) => {
        removeTextureCalls++;
        textureKeys.delete(key);
      },
      createCanvas: (key: string) => {
        createCanvasCalls++;
        textureKeys.add(key);
        return fakeCanvasTexture;
      },
    },
  };

  return {
    scene,
    stats: () => ({ createCanvasCalls, removeTextureCalls, removeFontCalls }),
  };
}

describe('installDebugBitmapFont idempotency (M2-T10 regression)', () => {
  it('creates the font+texture on the first call', () => {
    const { scene, stats } = makeFakeScene();
    installDebugBitmapFont(scene as unknown as Phaser.Scene);
    expect(stats().createCanvasCalls).toBe(1);
    expect(scene.cache.bitmapFont.exists(DEBUG_FONT_KEY)).toBe(true);
    expect(scene.textures.exists(DEBUG_FONT_KEY)).toBe(true);
  });

  it('a second call is a no-op — does not destroy/regenerate the texture', () => {
    const { scene, stats } = makeFakeScene();
    installDebugBitmapFont(scene as unknown as Phaser.Scene);
    installDebugBitmapFont(scene as unknown as Phaser.Scene);
    const s = stats();
    expect(s.createCanvasCalls).toBe(1);
    expect(s.removeTextureCalls).toBe(0);
    expect(s.removeFontCalls).toBe(0);
  });

  it('three calls across a scene (matching GameScene + DamageNumberSystem both calling it) still install exactly once', () => {
    const { scene, stats } = makeFakeScene();
    installDebugBitmapFont(scene as unknown as Phaser.Scene);
    installDebugBitmapFont(scene as unknown as Phaser.Scene);
    installDebugBitmapFont(scene as unknown as Phaser.Scene);
    expect(stats().createCanvasCalls).toBe(1);
  });
});
