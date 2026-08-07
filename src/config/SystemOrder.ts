/**
 * Declared system update order — docs/03-Technical-Architecture.md §8.3.
 * This array IS the update order. Do not reorder casually.
 */

export const SYSTEM_ORDER_GAMEPLAY = [
  // --- Input & time ---
  'input',
  'assist',
  'hitstop',

  // --- Simulation (velocity writers) ---
  'spawn',
  'mechanics',
  'ai',
  // Player updates inside GameScene between 'ai' and physics

  // --- Physics runs here (Phaser-driven) ---

  // --- Resolution (post-physics readers) ---
  'combat',
  'knockback',
  'checkpoint',
  'culling',

  // --- Presentation ---
  'vfx',
  'particles',
  'damageNumbers',
  'camera',
  'audio',
  'debug',
] as const;

export const SYSTEM_ORDER_UI = ['focus', 'toast', 'hud'] as const;

export type GameplaySystemId = (typeof SYSTEM_ORDER_GAMEPLAY)[number];
export type UiSystemId = (typeof SYSTEM_ORDER_UI)[number];
