export type GlyphVendor = 'xbox' | 'playstation' | 'switch' | 'generic';

let stub: readonly (Gamepad | null)[] | null = null;

export function detectVendor(id: string): GlyphVendor {
  const lower = id.toLowerCase();
  if (lower.includes('xbox') || lower.includes('xinput')) return 'xbox';
  if (lower.includes('playstation') || lower.includes('dualshock') || lower.includes('dualsense')) {
    return 'playstation';
  }
  if (lower.includes('switch') || lower.includes('joy-con')) return 'switch';
  return 'generic';
}

export function pollGamepads(): readonly (Gamepad | null)[] {
  if (stub !== null) return stub;
  if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') {
    return [];
  }
  return navigator.getGamepads();
}

/** Test-only: replace `navigator.getGamepads` results. Pass `null` to clear. */
export function __setGamepads(pads: readonly (Gamepad | null)[] | null): void {
  stub = pads;
}
