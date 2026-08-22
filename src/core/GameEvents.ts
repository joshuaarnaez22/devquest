import type { HitKind } from '@config/CombatFeedback';

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

/** Re-exported for callers that only need the event payload shape (M2-T5). */
export type { HitKind };
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
  'player:jumped': {
    readonly fromCoyote: boolean;
    readonly x: number;
    readonly y: number;
  };
  'player:landed': {
    readonly impactSpeed: number;
    readonly x: number;
    readonly y: number;
  };
  'player:dashed': {
    readonly x: number;
    readonly y: number;
    readonly flipX: boolean;
    readonly scaleX: number;
    readonly scaleY: number;
    readonly textureKey: string;
  };
  /** Knight parry (docs/06 §7.1.4) — GameScene reacts with hit-stop + attacker stagger. */
  'ability:parried': {
    readonly attacker: EntityId;
    readonly victim: EntityId;
    readonly hitstopMs: number;
  };
  'boss:defeated': { readonly bossId: BossDefId; readonly timeMs: number };
  'system:pauseRequested': Record<string, never>;
  'system:resumed': Record<string, never>;
}

export type GameEventName = keyof GameEventMap;
