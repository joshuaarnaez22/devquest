// NORMATIVE — collision category bitmask and the combat overlap pairs (docs/07-Combat.md §5.4).

export const CollisionGroup = {
  PLAYER_BODY: 1 << 0,
  PLAYER_HITBOX: 1 << 1,
  PLAYER_HURTBOX: 1 << 2,
  ENEMY_BODY: 1 << 3,
  ENEMY_HITBOX: 1 << 4,
  ENEMY_HURTBOX: 1 << 5,
  PLAYER_PROJECTILE: 1 << 6,
  ENEMY_PROJECTILE: 1 << 7,
  TERRAIN: 1 << 8,
  ONE_WAY: 1 << 9,
  HAZARD: 1 << 10,
  PICKUP: 1 << 11,
  TRIGGER: 1 << 12,
} as const;

export type CollisionGroupKey = keyof typeof CollisionGroup;

/** How an overlap became a hit — carried on every QueuedHit (§12). */
export type CombatHitSource = 'melee' | 'projectile' | 'contact' | 'hazard';

/**
 * The overlap pairs that queue a hit (§5.4). Terrain/one-way collisions are
 * physics, not hits, and entity bodies deliberately do NOT collide with each
 * other — contact damage handles "do not stand inside an enemy" instead. A
 * system registers `physics.add.overlap` for each pair once the groups exist.
 */
export const COMBAT_OVERLAP_PAIRS = [
  { attacker: 'PLAYER_HITBOX', victim: 'ENEMY_HURTBOX', source: 'melee' },
  { attacker: 'ENEMY_HITBOX', victim: 'PLAYER_HURTBOX', source: 'melee' },
  { attacker: 'PLAYER_PROJECTILE', victim: 'ENEMY_HURTBOX', source: 'projectile' },
  { attacker: 'ENEMY_PROJECTILE', victim: 'PLAYER_HURTBOX', source: 'projectile' },
  { attacker: 'ENEMY_BODY', victim: 'PLAYER_HURTBOX', source: 'contact' },
  { attacker: 'HAZARD', victim: 'PLAYER_HURTBOX', source: 'hazard' },
] as const satisfies readonly {
  attacker: CollisionGroupKey;
  victim: CollisionGroupKey;
  source: CombatHitSource;
}[];
