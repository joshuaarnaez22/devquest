import type { EventBus } from '@core/EventBus';
import type { GameEventMap, Vec2 } from '@core/GameEvents';
import type { InputFrame } from '@core/InputFrame';
import type { PlayerController } from '@entities/player/PlayerController';
import type { PlayerStateId } from '@entities/player/PlayerStateId';
import type { PlayerFsmHost } from '@entities/player/PlayerStates';
import type { SquashStretch } from '@entities/ProceduralAnim';

/**
 * `FeelPlayer`'s jump/land reaction state — split out (M2-T10) to keep
 * `FeelPlayer.ts` under the file-length budget. `PlayerController.tryJump` (the
 * timing/physics math, fully unit-tested in `PlayerController.test.ts`) is
 * untouched; this is only the entity-level glue that reacts to its result
 * (squash, bus events, air-jump/dash bookkeeping) — moved, not changed.
 */
export interface PlayerJumpState {
  originY: number | null;
  airJumpsRemaining: number;
  airDashAvailable: boolean;
  coyoteExpiresAt: number;
  kind: PlayerFsmHost['jumpKind'];
  lastHeight: number;
}

export function createJumpState(airJumps: number): PlayerJumpState {
  return {
    originY: null,
    airJumpsRemaining: airJumps,
    airDashAvailable: true,
    coyoteExpiresAt: 0,
    kind: null,
    lastHeight: 0,
  };
}

export interface JumpDeps {
  readonly controller: PlayerController;
  readonly bus: EventBus<GameEventMap>;
  readonly squash: SquashStretch;
  /** The current hero's `movement.airJumps` — refilled on ground/coyote/wall jump. */
  readonly maxAirJumps: number;
}

export interface JumpFrameInfo {
  readonly frame: InputFrame;
  readonly t: number;
  readonly x: number;
  readonly y: number;
  readonly grounded: boolean;
  readonly wallDir: -1 | 0 | 1;
  readonly moveState: PlayerStateId;
}

/** True if this jump result takes the player airborne. */
export interface JumpOutcome {
  readonly setGroundedFalse: boolean;
}

const NO_OUTCOME: JumpOutcome = { setGroundedFalse: false };

/** Wall jump only while sliding / able to slide — docs/06 §5.6. */
export function canWallJump(state: PlayerJumpState, deps: JumpDeps, info: JumpFrameInfo): boolean {
  if (info.grounded || deps.controller.isDashing) return false;
  if (deps.controller.isWallJumpLocked(info.t)) return false;
  if (info.wallDir === 0) return false;
  if (info.moveState === 'WALL_SLIDE') return true;
  return info.frame.moveX === info.wallDir && deps.controller.verticalVelocity > 0;
}

export function resolveJump(
  state: PlayerJumpState,
  deps: JumpDeps,
  info: JumpFrameInfo,
): JumpOutcome {
  const jump = deps.controller.tryJump(info.frame, {
    grounded: info.grounded,
    coyoteExpiresAt: state.coyoteExpiresAt,
    airJumpsRemaining: state.airJumpsRemaining,
    onWall: canWallJump(state, deps, info),
    wallDir: info.wallDir,
    now: info.t,
  });
  return applyJumpResult(state, deps, jump, { x: info.x, y: info.y });
}

export function applyJumpResult(
  state: PlayerJumpState,
  deps: JumpDeps,
  jump: ReturnType<PlayerController['tryJump']>,
  point: Readonly<Vec2>,
): JumpOutcome {
  if (jump.kind === 'none') return NO_OUTCOME;
  state.kind = jump.kind;
  deps.squash.jump();
  deps.bus.emit('player:jumped', { fromCoyote: jump.kind === 'coyote', x: point.x, y: point.y });

  if (jump.kind === 'ground' || jump.kind === 'coyote') {
    state.airJumpsRemaining = deps.maxAirJumps;
    state.coyoteExpiresAt = 0;
    state.originY = point.y;
    return { setGroundedFalse: true };
  }
  if (jump.kind === 'air') {
    state.airJumpsRemaining = jump.remaining;
    state.coyoteExpiresAt = 0;
    return NO_OUTCOME;
  }
  // wall — restores air jump + refreshes dash (docs/06 §5.6)
  state.coyoteExpiresAt = 0;
  state.originY = point.y;
  state.airJumpsRemaining = deps.maxAirJumps;
  state.airDashAvailable = true;
  deps.controller.refreshDashCooldown();
  return { setGroundedFalse: true };
}

export interface LandingInfo {
  readonly frame: InputFrame;
  readonly x: number;
  readonly y: number;
  readonly t: number;
}

/** Landing: refresh air resources, then resolve a buffered jump immediately. */
export function onLanded(state: PlayerJumpState, deps: JumpDeps, info: LandingInfo): JumpOutcome {
  const impactSpeed = Math.max(0, deps.controller.verticalVelocity);
  deps.squash.land(impactSpeed);
  deps.bus.emit('player:landed', { impactSpeed, x: info.x, y: info.y });
  if (state.originY !== null) {
    state.lastHeight = Math.max(0, state.originY - info.y);
    state.originY = null;
  }
  deps.controller.setVerticalVelocity(0);
  state.coyoteExpiresAt = 0;
  state.airDashAvailable = true;
  deps.controller.refreshDashCooldown();

  // grounded:true always short-circuits tryJump to the 'ground' branch, so this
  // value is inert here — kept as the pre-refill count to match the original
  // call site exactly (the refill itself happens in the caller, on the same edge).
  const jump = deps.controller.tryJump(info.frame, {
    grounded: true,
    coyoteExpiresAt: 0,
    airJumpsRemaining: state.airJumpsRemaining,
    onWall: false,
    wallDir: 0,
    now: info.t,
  });
  return applyJumpResult(state, deps, jump, { x: info.x, y: info.y });
}
