/**
 * Hit-flash timing (docs/07-Combat.md §6.3): full hold for `flashMs`, then a 40ms
 * fade. `setTintFill` has no alpha channel, so the "fade" is faked by lerping the
 * fill colour toward black — it reads correctly because the sprite's own outline is
 * near-black. Pure: returns the colour to apply each frame; a caller (once GameScene
 * wiring exists) applies it via `sprite.setTintFill`/`clearTint` — `components` may
 * not import Phaser.
 */
const FADE_MS = 40;

export class HitFlash {
  private colour = 0;
  private flashMs = 0;
  private elapsedMs = Infinity; // inactive until the first start()

  start(colour: number, flashMs: number): void {
    this.colour = colour;
    this.flashMs = flashMs;
    this.elapsedMs = 0;
  }

  update(deltaMs: number): void {
    if (!this.active) return;
    this.elapsedMs += deltaMs;
  }

  get active(): boolean {
    return this.elapsedMs < this.flashMs + FADE_MS;
  }

  /** Tint-fill colour to apply this frame, or `null` once faded out (clear tint). */
  currentColour(): number | null {
    if (!this.active) return null;
    if (this.elapsedMs <= this.flashMs) return this.colour; // full hold
    const v = 1 - (this.elapsedMs - this.flashMs) / FADE_MS; // 1 → 0 over the fade
    return lerpColour(0x000000, this.colour, v);
  }
}

/** Channel-wise RGB lerp of two 0xRRGGBB colours. */
export function lerpColour(from: number, to: number, t: number): number {
  const fr = (from >> 16) & 0xff;
  const fg = (from >> 8) & 0xff;
  const fb = from & 0xff;
  const tr = (to >> 16) & 0xff;
  const tg = (to >> 8) & 0xff;
  const tb = to & 0xff;
  const r = Math.round(fr + (tr - fr) * t);
  const g = Math.round(fg + (tg - fg) * t);
  const b = Math.round(fb + (tb - fb) * t);
  return (r << 16) | (g << 8) | b;
}
