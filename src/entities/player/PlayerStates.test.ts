import { describe, expect, it } from 'vitest';
import { StateMachine } from '@core/StateMachine';
import {
  PLAYER_STATE_DURATION_MS,
  PLAYER_TRANSITIONS,
  RUN_STOP_VX,
  allowedTransitions,
  createPlayerFsmHost,
  createPlayerStateMachine,
  createPlayerStates,
  tickPlayerFsm,
} from '@entities/player/PlayerStates';
import type { PlayerStateId } from '@entities/player/PlayerStateId';
import type { PlayerFsmHost } from '@entities/player/PlayerStates';

const ALL_IDS: readonly PlayerStateId[] = [
  'IDLE',
  'RUN',
  'JUMP',
  'AIR_JUMP',
  'FALL',
  'LAND',
  'WALL_SLIDE',
  'WALL_JUMP',
  'ATTACK_1',
  'ATTACK_2',
  'ATTACK_3',
  'AIR_ATTACK',
  'DASH',
  'SPECIAL',
  'CROUCH',
  'HURT',
  'DEATH',
];

function drive(
  from: PlayerStateId,
  mutate: (host: PlayerFsmHost) => void,
): { fsm: StateMachine<PlayerFsmHost, PlayerStateId>; host: PlayerFsmHost } {
  const host = createPlayerFsmHost();
  const fsm = createPlayerStateMachine(host, from);
  mutate(host);
  tickPlayerFsm(fsm, { time: 0, delta: 16 });
  return { fsm, host };
}

describe('PlayerStates', () => {
  it('LAND duration is exactly 0 ms', () => {
    expect(PLAYER_STATE_DURATION_MS.LAND).toBe(0);
  });

  it('defines every PlayerStateId exactly once', () => {
    const ids = createPlayerStates().map(s => s.id);
    expect(ids.sort()).toEqual([...ALL_IDS].sort());
  });

  it('populates allowed for every state from the diagram edges', () => {
    for (const id of ALL_IDS) {
      const state = createPlayerStates().find(s => s.id === id);
      expect(state).toBeDefined();
      expect(state!.allowed).toEqual(allowedTransitions(id));
    }
  });

  it('allows every diagram transition', () => {
    for (const edge of PLAYER_TRANSITIONS) {
      const allowed = allowedTransitions(edge.from);
      expect(allowed, `${edge.from} → ${edge.to}`).toContain(edge.to);
    }
  });

  it('rejects a sample of illegal transitions in dev', () => {
    const host = createPlayerFsmHost();
    const states = createPlayerStates().map(s =>
      s.id === 'IDLE'
        ? { ...s, update: (): PlayerStateId => 'DEATH' } // IDLE ↛ DEATH
        : s,
    );
    const fsm = new StateMachine(host, states, 'IDLE');
    expect(() => fsm.update({ time: 0, delta: 16 })).toThrow(/not allowed/);
  });

  it('rejects LAND → FALL (illegal)', () => {
    const host = createPlayerFsmHost();
    const states = createPlayerStates().map(s =>
      s.id === 'LAND' ? { ...s, update: (): PlayerStateId => 'FALL' } : s,
    );
    const fsm = new StateMachine(host, states, 'LAND');
    expect(() => fsm.update({ time: 0, delta: 0 })).toThrow(/not allowed/);
  });

  describe('driven transitions', () => {
    it('IDLE → RUN on moveX', () => {
      const { fsm } = drive('IDLE', h => {
        h.moveX = 1;
      });
      expect(fsm.id).toBe('RUN');
    });

    it('IDLE → FALL when airborne', () => {
      const { fsm } = drive('IDLE', h => {
        h.grounded = false;
      });
      expect(fsm.id).toBe('FALL');
    });

    it('IDLE → JUMP on ground jump', () => {
      const { fsm } = drive('IDLE', h => {
        h.jumpKind = 'ground';
      });
      expect(fsm.id).toBe('JUMP');
    });

    it('IDLE → CROUCH when down held', () => {
      const { fsm } = drive('IDLE', h => {
        h.downHeld = true;
      });
      expect(fsm.id).toBe('CROUCH');
    });

    it('RUN → IDLE when stopped', () => {
      const { fsm } = drive('RUN', h => {
        h.moveX = 0;
        h.absVx = RUN_STOP_VX - 1;
      });
      expect(fsm.id).toBe('IDLE');
    });

    it('JUMP → FALL when vy >= 0', () => {
      const { fsm } = drive('JUMP', h => {
        h.vy = 1;
        h.jumpKind = null;
      });
      expect(fsm.id).toBe('FALL');
    });

    it('JUMP → AIR_JUMP on air jump', () => {
      const { fsm } = drive('JUMP', h => {
        h.vy = -100;
        h.jumpKind = 'air';
      });
      expect(fsm.id).toBe('AIR_JUMP');
    });

    it('FALL → LAND → IDLE same frame (0 ms LAND)', () => {
      const { fsm } = drive('FALL', h => {
        h.grounded = true;
        h.moveX = 0;
      });
      expect(fsm.id).toBe('IDLE');
      expect(fsm.getHistory()).toContain('LAND');
    });

    it('FALL → LAND → RUN when moveX ≠ 0', () => {
      const { fsm } = drive('FALL', h => {
        h.grounded = true;
        h.moveX = 1;
      });
      expect(fsm.id).toBe('RUN');
    });

    it('FALL → LAND → JUMP on buffered jump', () => {
      const { fsm } = drive('FALL', h => {
        h.grounded = true;
        h.bufferedJump = true;
        h.jumpKind = 'ground';
      });
      expect(fsm.id).toBe('JUMP');
    });

    it('FALL → JUMP on coyote', () => {
      const { fsm } = drive('FALL', h => {
        h.grounded = false;
        h.jumpKind = 'coyote';
        h.withinCoyote = true;
      });
      expect(fsm.id).toBe('JUMP');
    });

    it('DASH outranks JUMP when both pressed', () => {
      const { fsm } = drive('IDLE', h => {
        h.wantsDash = true;
        h.dashReady = true;
        h.jumpKind = 'ground';
      });
      expect(fsm.id).toBe('DASH');
    });

    it('active dash stays in DASH even when cooldown flips dashReady off', () => {
      const { fsm } = drive('RUN', h => {
        h.dashing = true;
        h.dashReady = false;
        h.wantsSpecial = true;
        h.specialReady = true;
      });
      expect(fsm.id).toBe('DASH');
    });

    it('DASH → FALL when finished airborne', () => {
      const { fsm } = drive('DASH', h => {
        h.dashFinished = true;
        h.grounded = false;
      });
      expect(fsm.id).toBe('FALL');
    });

    it('SPECIAL outranks DASH', () => {
      const { fsm } = drive('IDLE', h => {
        h.wantsSpecial = true;
        h.specialReady = true;
        h.wantsDash = true;
        h.dashReady = true;
      });
      expect(fsm.id).toBe('SPECIAL');
    });

    it('HURT → DEATH when hp <= 0', () => {
      const { fsm } = drive('HURT', h => {
        h.hp = 0;
      });
      expect(fsm.id).toBe('DEATH');
    });

    it('CROUCH → IDLE when down released', () => {
      const { fsm } = drive('CROUCH', h => {
        h.downHeld = false;
      });
      expect(fsm.id).toBe('IDLE');
    });

    it('WALL_JUMP → FALL when input lock expires', () => {
      const { fsm } = drive('WALL_JUMP', h => {
        h.vy = -100;
        h.wallJumpLockExpired = true;
      });
      expect(fsm.id).toBe('FALL');
    });

    it('FALL → WALL_SLIDE when on wall toward input and falling', () => {
      const { fsm } = drive('FALL', h => {
        h.grounded = false;
        h.onWall = true;
        h.inputToWall = true;
        h.vy = 40;
      });
      expect(fsm.id).toBe('WALL_SLIDE');
    });

    it('WALL_SLIDE → FALL when off wall', () => {
      const { fsm } = drive('WALL_SLIDE', h => {
        h.onWall = false;
        h.inputToWall = false;
      });
      expect(fsm.id).toBe('FALL');
    });

    it('AIR_ATTACK → LAND when grounded', () => {
      const host = createPlayerFsmHost();
      host.grounded = true;
      host.moveX = 0;
      const fsm = createPlayerStateMachine(host, 'AIR_ATTACK');
      tickPlayerFsm(fsm, { time: 0, delta: 16 });
      // LAND passthrough → IDLE
      expect(fsm.id).toBe('IDLE');
      expect(fsm.getHistory()).toContain('LAND');
    });
  });
});
