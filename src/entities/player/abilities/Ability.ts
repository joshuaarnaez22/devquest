import type { Hurtbox } from '@components/Hurtbox';
import type { EventBus } from '@core/EventBus';
import type { EntityId, GameEventMap } from '@core/GameEvents';
import type { InputFrame } from '@core/InputFrame';
import type { FeelPlayer } from '@entities/player/FeelPlayer';
import type { HitQueue } from '@systems/HitQueue';
import type { VfxSystem } from '@systems/VfxSystem';

export type AbilityId = 'knight_guard' | 'samurai_iai' | 'ninja_shadow' | 'wizard_nova';

/** A hittable enemy, as abilities need it — currently only ever the one Skeleton
 * (M2), but shaped as a list so Nova's radius / Iai's line genuinely iterate
 * rather than special-casing a single hardcoded target. */
export interface AbilityTarget {
  readonly id: EntityId;
  readonly x: number;
  readonly y: number;
  readonly facingDir: -1 | 1;
  readonly hurtbox: Hurtbox;
  readonly active: boolean;
}

/**
 * docs/06-Characters.md §9.1 — NORMATIVE, the ONLY place per-character behaviour
 * lives. `player: FeelPlayer` (not the doc's `Player`) and `hitQueue: HitQueue`
 * (not `combat: CombatSystem`) — M2 has no `Player` abstraction yet (ADR-004: one
 * concrete class, extracted later) and the real pipeline is "queue, then resolve
 * once per frame centrally" (docs/07 §10.1), so abilities queue exactly like a
 * normal attack rather than reaching into `CombatSystem` directly.
 */
export interface AbilityContext {
  readonly player: FeelPlayer;
  readonly frame: InputFrame;
  readonly time: number;
  readonly delta: number;
  readonly bus: EventBus<GameEventMap>;
  readonly hitQueue: HitQueue;
  readonly vfx: VfxSystem;
  readonly isSolidAt: (x: number, y: number) => boolean;
  readonly getTargets: () => readonly AbilityTarget[];
}

export interface Ability {
  readonly id: AbilityId;

  /** Called once when the hero is selected (`FeelPlayer.setCharacter`). */
  init(ctx: AbilityContext): void;

  /** Can the ability start this frame? Checked before the FSM enters SPECIAL. */
  canActivate(ctx: AbilityContext): boolean;

  /** Called when the FSM enters SPECIAL. Return the state to hold. */
  onActivate(ctx: AbilityContext): 'hold' | 'complete';

  /** Called every frame while the FSM is in SPECIAL. */
  update(ctx: AbilityContext): 'hold' | 'complete';

  /** Called when SPECIAL exits, whether completed or interrupted. */
  onDeactivate(ctx: AbilityContext, reason: 'complete' | 'damaged' | 'cancelled'): void;

  /** Passive per-frame hook, called EVERY frame regardless of state (mana regen, guard-break timer). */
  passiveUpdate?(ctx: AbilityContext): void;

  /** Optional damage interception. Return the modified damage. Knight's Guard uses this. */
  onIncomingDamage?(
    ctx: AbilityContext,
    damage: number,
    source: EntityId,
    fromBehind: boolean,
  ): number;

  /** For the HUD: 0..1 readiness. */
  readiness(ctx: AbilityContext): number;
}
