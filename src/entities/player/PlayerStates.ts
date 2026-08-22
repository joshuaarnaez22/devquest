import { StateMachine } from '@core/StateMachine';
import type { State, StateContext } from '@core/StateMachine';
import type { PlayerStateId } from '@entities/player/PlayerStateId';

/** |vx| below this while moveX==0 leaves RUN → IDLE (docs/06 §6.1). */
export const RUN_STOP_VX = 8;

/**
 * Authoritative durations (ms). `LAND` is exactly 0 — Pillar 1 falsification #5.
 * docs/06-Characters.md §6.2
 */
export const PLAYER_STATE_DURATION_MS: Readonly<Partial<Record<PlayerStateId, number>>> = {
  LAND: 0,
  HURT: 300,
  WALL_JUMP: 120,
  DEATH: 1200,
};

/** Diagram edges from docs/06-Characters.md §6.1 — source of `allowed` arrays. */
export const PLAYER_TRANSITIONS: readonly {
  readonly from: PlayerStateId;
  readonly to: PlayerStateId;
}[] = [
  { from: 'IDLE', to: 'RUN' },
  { from: 'IDLE', to: 'JUMP' },
  { from: 'IDLE', to: 'FALL' },
  { from: 'IDLE', to: 'ATTACK_1' },
  { from: 'IDLE', to: 'DASH' },
  { from: 'IDLE', to: 'SPECIAL' },
  { from: 'IDLE', to: 'CROUCH' },
  { from: 'IDLE', to: 'HURT' },

  { from: 'RUN', to: 'IDLE' },
  { from: 'RUN', to: 'JUMP' },
  { from: 'RUN', to: 'FALL' },
  { from: 'RUN', to: 'ATTACK_1' },
  { from: 'RUN', to: 'DASH' },
  { from: 'RUN', to: 'SPECIAL' },
  { from: 'RUN', to: 'HURT' },

  { from: 'JUMP', to: 'FALL' },
  { from: 'JUMP', to: 'AIR_JUMP' },
  { from: 'JUMP', to: 'AIR_ATTACK' },
  { from: 'JUMP', to: 'DASH' },
  { from: 'JUMP', to: 'WALL_SLIDE' },
  { from: 'JUMP', to: 'HURT' },

  { from: 'AIR_JUMP', to: 'FALL' },
  { from: 'AIR_JUMP', to: 'AIR_ATTACK' },
  { from: 'AIR_JUMP', to: 'DASH' },
  { from: 'AIR_JUMP', to: 'WALL_SLIDE' },

  { from: 'FALL', to: 'LAND' },
  { from: 'FALL', to: 'AIR_JUMP' },
  { from: 'FALL', to: 'JUMP' },
  { from: 'FALL', to: 'AIR_ATTACK' },
  { from: 'FALL', to: 'DASH' },
  { from: 'FALL', to: 'WALL_SLIDE' },
  { from: 'FALL', to: 'HURT' },

  { from: 'WALL_SLIDE', to: 'WALL_JUMP' },
  { from: 'WALL_SLIDE', to: 'FALL' },
  { from: 'WALL_SLIDE', to: 'DASH' },
  { from: 'WALL_SLIDE', to: 'HURT' },

  { from: 'WALL_JUMP', to: 'FALL' },

  { from: 'LAND', to: 'IDLE' },
  { from: 'LAND', to: 'RUN' },
  { from: 'LAND', to: 'JUMP' },

  { from: 'ATTACK_1', to: 'ATTACK_2' },
  { from: 'ATTACK_1', to: 'IDLE' },
  { from: 'ATTACK_1', to: 'DASH' },
  { from: 'ATTACK_1', to: 'JUMP' },
  { from: 'ATTACK_1', to: 'HURT' },

  { from: 'ATTACK_2', to: 'ATTACK_3' },
  { from: 'ATTACK_2', to: 'IDLE' },
  { from: 'ATTACK_2', to: 'DASH' },
  { from: 'ATTACK_2', to: 'HURT' },

  { from: 'ATTACK_3', to: 'IDLE' },
  { from: 'ATTACK_3', to: 'HURT' },

  { from: 'AIR_ATTACK', to: 'FALL' },
  { from: 'AIR_ATTACK', to: 'LAND' },
  { from: 'AIR_ATTACK', to: 'HURT' },

  { from: 'DASH', to: 'FALL' },
  { from: 'DASH', to: 'IDLE' },
  { from: 'DASH', to: 'RUN' },
  { from: 'DASH', to: 'HURT' },

  { from: 'SPECIAL', to: 'IDLE' },
  { from: 'SPECIAL', to: 'FALL' },
  { from: 'SPECIAL', to: 'HURT' },

  { from: 'CROUCH', to: 'IDLE' },

  { from: 'HURT', to: 'IDLE' },
  { from: 'HURT', to: 'FALL' },
  { from: 'HURT', to: 'DEATH' },
];

/** Mutable intent/sensors the FSM reads each tick — filled by the player entity. */
export interface PlayerFsmHost {
  grounded: boolean;
  moveX: number;
  /** Absolute horizontal speed (px/s). */
  absVx: number;
  /** Authoritative vertical velocity (Phaser Y-down; negative = rising). */
  vy: number;
  airJumpsRemaining: number;
  withinCoyote: boolean;
  onWall: boolean;
  inputToWall: boolean;
  /** Jump resolution this frame, if any. */
  jumpKind: 'ground' | 'coyote' | 'air' | 'wall' | null;
  bufferedJump: boolean;
  wantsDash: boolean;
  wantsAttack: boolean;
  wantsSpecial: boolean;
  downHeld: boolean;
  damaged: boolean;
  hp: number;
  /** Physics already in a dash — keep FSM in DASH even if dashReady flipped. */
  dashing: boolean;
  dashReady: boolean;
  specialReady: boolean;
  dashFinished: boolean;
  animComplete: boolean;
  hurtElapsed: boolean;
  wallJumpLockExpired: boolean;
  comboWindowOpen: boolean;
  comboLength: number;
}

export function allowedTransitions(from: PlayerStateId): readonly PlayerStateId[] {
  return PLAYER_TRANSITIONS.filter(e => e.from === from).map(e => e.to);
}

export function createPlayerFsmHost(): PlayerFsmHost {
  return {
    grounded: true,
    moveX: 0,
    absVx: 0,
    vy: 0,
    airJumpsRemaining: 0,
    withinCoyote: false,
    onWall: false,
    inputToWall: false,
    jumpKind: null,
    bufferedJump: false,
    wantsDash: false,
    wantsAttack: false,
    wantsSpecial: false,
    downHeld: false,
    damaged: false,
    hp: 1,
    dashing: false,
    dashReady: false,
    specialReady: false,
    dashFinished: false,
    animComplete: false,
    hurtElapsed: false,
    wallJumpLockExpired: false,
    comboWindowOpen: false,
    comboLength: 3,
  };
}

/**
 * Interrupt priority — docs/06 §6.3.
 * DEATH > HURT > SPECIAL > DASH > JUMP > ATTACK > (caller movement).
 * Active dash is not player-cancellable (docs/06 §5.5).
 */
function interruptPriority(
  host: PlayerFsmHost,
  opts: { readonly allowJump?: boolean; readonly allowAttack?: boolean } = {},
): PlayerStateId | undefined {
  const lethal = lethalInterrupt(host);
  if (lethal !== undefined) return lethal;
  if (host.dashing) return 'DASH';
  if (host.wantsSpecial && host.specialReady) return 'SPECIAL';
  if (host.wantsDash && host.dashReady) return 'DASH';
  return softInterrupts(host, opts);
}

function softInterrupts(
  host: PlayerFsmHost,
  opts: { readonly allowJump?: boolean; readonly allowAttack?: boolean },
): PlayerStateId | undefined {
  if (opts.allowJump !== false) {
    const jump = jumpFamily(host);
    if (jump !== undefined) return jump;
  }
  if (opts.allowAttack !== false && host.wantsAttack) {
    return host.grounded ? 'ATTACK_1' : 'AIR_ATTACK';
  }
  return undefined;
}

/**
 * `damaged` must win over `hp <= 0` — a killing blow sets both true on the same
 * frame, and §6.1's diagram only allows `HURT -> DEATH`, never `<state> -> DEATH`
 * directly. Checking `hp <= 0` first sent a fatal hit straight from e.g. IDLE to
 * DEATH, an illegal edge per `PLAYER_TRANSITIONS`, crashing the FSM assertion.
 */
function lethalInterrupt(host: PlayerFsmHost): PlayerStateId | undefined {
  if (host.damaged) return 'HURT';
  if (host.hp <= 0) return 'DEATH';
  return undefined;
}

function jumpFamily(host: PlayerFsmHost): PlayerStateId | undefined {
  if (host.jumpKind === 'air') return 'AIR_JUMP';
  if (host.jumpKind === 'wall') return 'WALL_JUMP';
  if (host.jumpKind === 'ground' || host.jumpKind === 'coyote') return 'JUMP';
  return undefined;
}

function wallSlide(host: PlayerFsmHost): boolean {
  return host.onWall && host.inputToWall && host.vy > 0;
}

function state(
  id: PlayerStateId,
  update: (host: PlayerFsmHost, ctx: StateContext) => PlayerStateId | undefined,
): State<PlayerFsmHost, PlayerStateId> {
  return {
    id,
    allowed: allowedTransitions(id),
    update,
  };
}

export function createPlayerStates(): readonly State<PlayerFsmHost, PlayerStateId>[] {
  return [
    state('IDLE', host => {
      const hi = interruptPriority(host);
      if (hi !== undefined) return hi;
      if (!host.grounded) return 'FALL';
      if (host.downHeld) return 'CROUCH';
      if (host.moveX !== 0) return 'RUN';
      return undefined;
    }),

    state('RUN', host => {
      const hi = interruptPriority(host);
      if (hi !== undefined) return hi;
      if (!host.grounded) return 'FALL';
      if (host.moveX === 0 && host.absVx < RUN_STOP_VX) return 'IDLE';
      return undefined;
    }),

    state('JUMP', host => {
      const hi = interruptPriority(host, { allowJump: true });
      if (hi !== undefined && hi !== 'JUMP') return hi;
      if (host.jumpKind === 'air') return 'AIR_JUMP';
      if (wallSlide(host)) return 'WALL_SLIDE';
      if (host.vy >= 0) return 'FALL';
      return undefined;
    }),

    state('AIR_JUMP', host => {
      // Diagram has no AIR_JUMP → HURT; only dash / attack / wall / fall.
      if (host.dashing || (host.wantsDash && host.dashReady)) return 'DASH';
      if (host.wantsAttack) return 'AIR_ATTACK';
      if (wallSlide(host)) return 'WALL_SLIDE';
      if (host.vy >= 0) return 'FALL';
      return undefined;
    }),

    state('FALL', host => {
      const hi = interruptPriority(host);
      if (hi !== undefined) return hi;
      if (host.grounded) return 'LAND';
      if (host.jumpKind === 'air') return 'AIR_JUMP';
      if (host.jumpKind === 'coyote' || (host.jumpKind === 'ground' && host.withinCoyote)) {
        return 'JUMP';
      }
      if (wallSlide(host)) return 'WALL_SLIDE';
      return undefined;
    }),

    state('LAND', host => {
      // 0 ms passthrough — exit same frame (docs/06 §6.2).
      if (host.bufferedJump || host.jumpKind === 'ground' || host.jumpKind === 'coyote') {
        return 'JUMP';
      }
      if (host.moveX !== 0) return 'RUN';
      return 'IDLE';
    }),

    state('WALL_SLIDE', host => {
      const hi = interruptPriority(host, { allowAttack: false });
      if (hi !== undefined) return hi;
      if (host.jumpKind === 'wall') return 'WALL_JUMP';
      if (!host.onWall || !host.inputToWall) return 'FALL';
      return undefined;
    }),

    state('WALL_JUMP', host => {
      if (host.vy >= 0 || host.wallJumpLockExpired) return 'FALL';
      return undefined;
    }),

    state('ATTACK_1', host => {
      if (host.damaged) return 'HURT';
      if (host.dashing || (host.wantsDash && host.dashReady)) return 'DASH';
      if (host.jumpKind === 'ground' || host.jumpKind === 'coyote') return 'JUMP';
      if (host.wantsAttack && host.comboWindowOpen) return 'ATTACK_2';
      if (host.animComplete) return 'IDLE';
      return undefined;
    }),

    state('ATTACK_2', host => {
      if (host.damaged) return 'HURT';
      if (host.dashing || (host.wantsDash && host.dashReady)) return 'DASH';
      if (host.wantsAttack && host.comboWindowOpen && host.comboLength === 3) return 'ATTACK_3';
      if (host.animComplete) return 'IDLE';
      return undefined;
    }),

    state('ATTACK_3', host => {
      if (host.damaged) return 'HURT';
      if (host.animComplete) return 'IDLE';
      return undefined;
    }),

    state('AIR_ATTACK', host => {
      if (host.damaged) return 'HURT';
      if (host.grounded) return 'LAND';
      if (host.animComplete) return 'FALL';
      return undefined;
    }),

    state('DASH', host => {
      if (host.damaged) return 'HURT';
      if (!host.dashFinished) return undefined;
      if (!host.grounded) return 'FALL';
      if (host.moveX !== 0) return 'RUN';
      return 'IDLE';
    }),

    state('SPECIAL', host => {
      if (host.damaged) return 'HURT';
      if (!host.animComplete) return undefined;
      return host.grounded ? 'IDLE' : 'FALL';
    }),

    state('CROUCH', host => {
      if (!host.downHeld) return 'IDLE';
      return undefined;
    }),

    state('HURT', host => {
      if (host.hp <= 0) return 'DEATH';
      if (!host.hurtElapsed) return undefined;
      return host.grounded ? 'IDLE' : 'FALL';
    }),

    state('DEATH', () => undefined),
  ];
}

export function createPlayerStateMachine(
  host: PlayerFsmHost,
  initial: PlayerStateId = 'IDLE',
): StateMachine<PlayerFsmHost, PlayerStateId> {
  return new StateMachine(host, createPlayerStates(), initial);
}

/**
 * Advance the FSM, double-ticking when landing so LAND exits in the same frame.
 */
export function tickPlayerFsm(
  fsm: StateMachine<PlayerFsmHost, PlayerStateId>,
  ctx: StateContext,
): void {
  fsm.update(ctx);
  if (fsm.id === 'LAND') {
    fsm.update({ time: ctx.time, delta: 0 });
  }
}
