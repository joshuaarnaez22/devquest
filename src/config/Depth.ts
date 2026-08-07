// NORMATIVE — docs/04-Art-Direction.md §10.1. The only legal source of depth values.

export const Depth = {
  BACKGROUND_FAR: -1000,
  BACKGROUND_MID: -900,
  BACKGROUND_NEAR: -800,
  AMBIENT_TINT: -700,

  TILEMAP_BACK: -100,
  SHADOW: -50,

  PICKUP: 0,
  ENEMY: 10,
  BOSS: 15,
  PLAYER: 20,
  PROJECTILE: 30,

  TILEMAP_FRONT: 40,
  HAZARD: 45,

  VFX_WORLD: 50,
  PARTICLE: 55,
  DAMAGE_NUMBER: 60,

  FOREGROUND_PARALLAX: 70,

  SCREEN_FLASH: 900,
  HUD: 1000,
  TOAST: 1050,
  MENU: 1100,
  MODAL: 1200,
  TRANSITION: 1300,
  DEBUG: 9999,
} as const;

export type DepthKey = keyof typeof Depth;
