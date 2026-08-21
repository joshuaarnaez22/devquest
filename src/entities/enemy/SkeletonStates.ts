import { StateMachine } from '@core/StateMachine';
import {
  SKELETON_OVERHEAD_SWING,
  SKELETON_STATS,
  SKELETON_TIMINGS,
} from '@entities/enemy/SkeletonCombat';
import type { State, StateContext } from '@core/StateMachine';
import type { SkeletonStateId } from '@entities/enemy/SkeletonStateId';

/**
 * Basic-tier Skeleton FSM (M2-T9) — the shared framework's diagram in
 * docs/08-Enemy-System.md §5.1, scoped to what a `patrol`+`chase`+`melee` enemy
 * with one attack actually reaches. Two simplifications from the full diagram:
 *
 * 1. No waypoint system exists yet (M3), so `PATROL --> IDLE : reached waypoint`
 *    has no trigger — the Skeleton patrols indefinitely (reversing at ledges/walls,
 *    handled by the entity via `LedgeSensor`, not the FSM) until it spots the player.
 * 2. `SEARCH` is omitted (no lost-player re-acquisition logic yet) — `CHASE`/`RECOVER`/
 *    `HURT`'s "lost player" edges go straight to `IDLE` instead of `SEARCH`.
 *
 * One more ambiguity in the source diagram: `WINDUP --> RECOVER : interrupted (poise
 * broken)` and the universal `WINDUP --> HURT : poise broken` both fire on the same
 * trigger. Resolved in favour of the universal rule (poise break always goes to
 * HURT, matching §8.1's "on break: full stagger") — the RECOVER edge would skip the
 * stagger the player just earned, which contradicts the fairness contract in §5.2.
 */
export const SKELETON_STATE_DURATION_MS: Readonly<Partial<Record<SkeletonStateId, number>>> = {
  IDLE: SKELETON_TIMINGS.idleDurationMs,
  ALERT: SKELETON_TIMINGS.alertDurationMs,
  WINDUP: SKELETON_OVERHEAD_SWING.windupMs,
  ATTACK: SKELETON_OVERHEAD_SWING.activeMs,
  RECOVER: SKELETON_OVERHEAD_SWING.recoverMs,
  HURT: SKELETON_STATS.staggerMs,
};

export const SKELETON_TRANSITIONS: readonly {
  readonly from: SkeletonStateId;
  readonly to: SkeletonStateId;
}[] = [
  { from: 'IDLE', to: 'PATROL' },
  { from: 'IDLE', to: 'ALERT' },
  { from: 'IDLE', to: 'HURT' },
  { from: 'IDLE', to: 'DEATH' },

  { from: 'PATROL', to: 'ALERT' },
  { from: 'PATROL', to: 'HURT' },
  { from: 'PATROL', to: 'DEATH' },

  { from: 'ALERT', to: 'CHASE' },
  { from: 'ALERT', to: 'IDLE' },
  { from: 'ALERT', to: 'HURT' },
  { from: 'ALERT', to: 'DEATH' },

  { from: 'CHASE', to: 'WINDUP' },
  { from: 'CHASE', to: 'IDLE' },
  { from: 'CHASE', to: 'HURT' },
  { from: 'CHASE', to: 'DEATH' },

  { from: 'WINDUP', to: 'ATTACK' },
  { from: 'WINDUP', to: 'HURT' },
  { from: 'WINDUP', to: 'DEATH' },

  { from: 'ATTACK', to: 'RECOVER' },
  { from: 'ATTACK', to: 'HURT' },
  { from: 'ATTACK', to: 'DEATH' },

  { from: 'RECOVER', to: 'CHASE' },
  { from: 'RECOVER', to: 'IDLE' },
  { from: 'RECOVER', to: 'HURT' },
  { from: 'RECOVER', to: 'DEATH' },

  { from: 'HURT', to: 'CHASE' },
  { from: 'HURT', to: 'IDLE' },
  { from: 'HURT', to: 'DEATH' },
];

/** Mutable intent/sensors the FSM reads each tick — filled by the Skeleton entity. */
export interface SkeletonFsmHost {
  seesPlayer: boolean;
  inAttackRange: boolean;
  attackOffCooldown: boolean;
  hp: number;
  /** Edge-triggered: true only the frame poise broke (mirrors `PlayerFsmHost.damaged`). */
  poiseBroken: boolean;
  idleElapsed: boolean;
  alertElapsed: boolean;
  windupElapsed: boolean;
  activeElapsed: boolean;
  recoverElapsed: boolean;
  staggerElapsed: boolean;
}

export function createSkeletonFsmHost(): SkeletonFsmHost {
  return {
    seesPlayer: false,
    inAttackRange: false,
    attackOffCooldown: true,
    hp: SKELETON_STATS.maxHp,
    poiseBroken: false,
    idleElapsed: false,
    alertElapsed: false,
    windupElapsed: false,
    activeElapsed: false,
    recoverElapsed: false,
    staggerElapsed: false,
  };
}

export function allowedTransitions(from: SkeletonStateId): readonly SkeletonStateId[] {
  return SKELETON_TRANSITIONS.filter(e => e.from === from).map(e => e.to);
}

/** DEATH > HURT — the only two lethal/stagger interrupts a Basic Skeleton has. */
function lethalInterrupt(host: SkeletonFsmHost): SkeletonStateId | undefined {
  if (host.hp <= 0) return 'DEATH';
  if (host.poiseBroken) return 'HURT';
  return undefined;
}

function state(
  id: SkeletonStateId,
  update: (host: SkeletonFsmHost, ctx: StateContext) => SkeletonStateId | undefined,
): State<SkeletonFsmHost, SkeletonStateId> {
  return {
    id,
    allowed: allowedTransitions(id),
    update,
  };
}

export function createSkeletonStates(): readonly State<SkeletonFsmHost, SkeletonStateId>[] {
  return [
    state('IDLE', host => {
      const hi = lethalInterrupt(host);
      if (hi !== undefined) return hi;
      if (host.seesPlayer) return 'ALERT';
      if (host.idleElapsed) return 'PATROL';
      return undefined;
    }),

    state('PATROL', host => {
      const hi = lethalInterrupt(host);
      if (hi !== undefined) return hi;
      if (host.seesPlayer) return 'ALERT';
      return undefined;
    }),

    state('ALERT', host => {
      const hi = lethalInterrupt(host);
      if (hi !== undefined) return hi;
      if (!host.seesPlayer) return 'IDLE';
      if (host.alertElapsed) return 'CHASE';
      return undefined;
    }),

    state('CHASE', host => {
      const hi = lethalInterrupt(host);
      if (hi !== undefined) return hi;
      if (host.inAttackRange && host.attackOffCooldown) return 'WINDUP';
      if (!host.seesPlayer) return 'IDLE';
      return undefined;
    }),

    state('WINDUP', host => {
      const hi = lethalInterrupt(host);
      if (hi !== undefined) return hi;
      if (host.windupElapsed) return 'ATTACK';
      return undefined;
    }),

    state('ATTACK', host => {
      const hi = lethalInterrupt(host);
      if (hi !== undefined) return hi;
      if (host.activeElapsed) return 'RECOVER';
      return undefined;
    }),

    state('RECOVER', host => {
      const hi = lethalInterrupt(host);
      if (hi !== undefined) return hi;
      if (!host.recoverElapsed) return undefined;
      return host.seesPlayer ? 'CHASE' : 'IDLE';
    }),

    state('HURT', host => {
      if (host.hp <= 0) return 'DEATH';
      if (!host.staggerElapsed) return undefined;
      return host.seesPlayer ? 'CHASE' : 'IDLE';
    }),

    state('DEATH', () => undefined),
  ];
}

export function createSkeletonStateMachine(
  host: SkeletonFsmHost,
  initial: SkeletonStateId = 'IDLE',
): StateMachine<SkeletonFsmHost, SkeletonStateId> {
  return new StateMachine(host, createSkeletonStates(), initial);
}
