/** M0 stub branded-id stand-ins — replaced in later milestones. */
export type EntityId = number;
export type EnemyDefId = string;
export type AbilityId = string;
export type CharmId = string;
export type CheckpointId = string;
export type LevelId = string;
export type WorldId = string;
export type BossDefId = string;
export type PortfolioSectionId = string;
export type SceneKey = string;
export type SettingKey = string;

export type HitKind = 'contact' | 'melee' | 'projectile';
export type Vec2 = { readonly x: number; readonly y: number };

/** Typed game event payloads (expand as systems land). */
export interface GameEventMap {
  'combat:hit': {
    readonly attacker: EntityId;
    readonly victim: EntityId;
    readonly damage: number;
    readonly kind: HitKind;
    readonly point: Vec2;
  };
  'combat:kill': {
    readonly victim: EntityId;
    readonly killer: EntityId;
    readonly enemyId: EnemyDefId;
  };
  'combat:playerDamaged': {
    readonly amount: number;
    readonly source: EntityId;
    readonly remainingHp: number;
  };
  'combat:playerDied': { readonly atCheckpoint: CheckpointId | null };
  'player:jumped': { readonly fromCoyote: boolean };
  'boss:defeated': { readonly bossId: BossDefId; readonly timeMs: number };
  'system:pauseRequested': Record<string, never>;
  'system:resumed': Record<string, never>;
}

export type GameEventName = keyof GameEventMap;
