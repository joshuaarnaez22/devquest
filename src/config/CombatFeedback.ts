// NORMATIVE — the nine-layer feedback tier lookup and its enumerated ids (docs/07-Combat.md §12).
// Lives in config (not systems) so both `core` (GameEventMap) and `entities`/`systems` can
// import it without violating the layer-boundary order.

/** Feedback tier — drives hit-stop/flash/knockback/shake/vfx/particle magnitude (§12). */
export type HitKind = 'light' | 'heavy' | 'magic' | 'ranged' | 'contact' | 'hazard';

/** Slash/impact/death VFX ids — enumerated from §6.5 and §6.10. Extend as new VFX are added. */
export type VfxId =
  | 'slash_light'
  | 'slash_heavy'
  | 'slash_magic'
  | 'impact_small'
  | 'impact_spike'
  | 'explosion_small'
  | 'explosion_large';

/**
 * Impact particle ids — the hit-kind defaults from §6.9's first table, plus the
 * material-aware set from its second table (selected by an enemy's declared material,
 * overriding the hit-kind default; wired when enemies exist, M2-T9+) and `poise_break`
 * (§11.1, §8.3 — the stagger spark, not part of either §6.9 table).
 */
export type ParticleId =
  | 'spark'
  | 'arcane_mote'
  | 'dust'
  | 'bone_chip'
  | 'blood_mote'
  | 'spirit_wisp'
  | 'rock_chip'
  | 'scale_flake'
  | 'poise_break';

/** Damage-number style — fully enumerated in §6.8's style table. */
export type DamageNumberStyle =
  'normal' | 'critical' | 'magic' | 'playerDamage' | 'heal' | 'blocked';

export interface HitTier {
  readonly hitStopMs: number;
  readonly flashMs: number;
  readonly knockbackSpeed: number;
  readonly knockbackLift: number;
  readonly knockbackDecayMs: number;
  readonly trauma: number;
  readonly vfxId: VfxId;
  readonly particleCount: number;
}

/** Feedback tier lookup, keyed by HitKind (§12). NORMATIVE. */
export const HIT_TIERS: Readonly<Record<HitKind, HitTier>> = {
  light: {
    hitStopMs: 60,
    flashMs: 80,
    knockbackSpeed: 70,
    knockbackLift: 0,
    knockbackDecayMs: 200,
    trauma: 0.14,
    vfxId: 'slash_light',
    particleCount: 6,
  },
  heavy: {
    hitStopMs: 110,
    flashMs: 80,
    knockbackSpeed: 140,
    knockbackLift: -60,
    knockbackDecayMs: 260,
    trauma: 0.26,
    vfxId: 'slash_heavy',
    particleCount: 10,
  },
  magic: {
    hitStopMs: 90,
    flashMs: 80,
    knockbackSpeed: 100,
    knockbackLift: -30,
    knockbackDecayMs: 220,
    trauma: 0.2,
    vfxId: 'slash_magic',
    particleCount: 8,
  },
  ranged: {
    hitStopMs: 50,
    flashMs: 80,
    knockbackSpeed: 50,
    knockbackLift: 0,
    knockbackDecayMs: 150,
    trauma: 0.08,
    vfxId: 'impact_small',
    particleCount: 4,
  },
  contact: {
    hitStopMs: 40,
    flashMs: 80,
    knockbackSpeed: 90,
    knockbackLift: -40,
    knockbackDecayMs: 200,
    trauma: 0.12,
    vfxId: 'impact_small',
    particleCount: 3,
  },
  hazard: {
    hitStopMs: 0,
    flashMs: 80,
    knockbackSpeed: 120,
    knockbackLift: -80,
    knockbackDecayMs: 250,
    trauma: 0.3,
    vfxId: 'impact_spike',
    particleCount: 8,
  },
} as const;

/** Default impact particle per hit kind (§6.9, first table). Material overrides this. */
export const PARTICLE_FOR_HIT_KIND: Readonly<Record<HitKind, ParticleId>> = {
  light: 'spark',
  heavy: 'spark',
  magic: 'arcane_mote',
  ranged: 'spark',
  contact: 'dust',
  hazard: 'spark',
} as const;

/** Hit-flash fill colour (§6.3) — `setTintFill`, not `setTint`. */
export const FLASH_COLOUR = {
  normal: 0xf2f0f5, // Palette N7
  fatal: 0xffffff,
  blocked: 0x9a97a6, // Palette N5
} as const;

/** Kill-bonus additions (§6.2, §6.6). Added on top of the tier's own value when fatal. */
export const KILL_BONUS = {
  hitStopMs: 30,
  trauma: 0.1,
} as const;

/** Enemy death explosion size (§6.10). Elite/boss selection lands with M4+ content. */
export const DEATH_VFX = {
  normal: 'explosion_small',
  elite: 'explosion_large',
} as const satisfies Record<string, VfxId>;

export interface VfxVisual {
  readonly width: number;
  readonly height: number;
  /** Frames @60fps; duration = frames/60*1000ms. Art itself lands in M3; M2 draws greys. */
  readonly frames: number;
}

/** Slash/impact size (§6.5) and death explosion size (§6.10). All ADD-blended. */
export const VFX_VISUAL: Readonly<Record<VfxId, VfxVisual>> = {
  slash_light: { width: 32, height: 32, frames: 5 },
  slash_heavy: { width: 48, height: 48, frames: 7 },
  slash_magic: { width: 40, height: 40, frames: 6 },
  impact_small: { width: 16, height: 16, frames: 4 },
  impact_spike: { width: 24, height: 24, frames: 5 },
  explosion_small: { width: 32, height: 32, frames: 8 },
  explosion_large: { width: 64, height: 64, frames: 12 },
} as const;
