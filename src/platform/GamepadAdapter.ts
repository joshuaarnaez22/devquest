export type GlyphVendor = 'xbox' | 'playstation' | 'switch' | 'generic';

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
  return navigator.getGamepads();
}
