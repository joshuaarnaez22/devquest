import { describe, expect, it } from 'vitest';
import { StateMachine } from '@core/StateMachine';
import {
  SKELETON_STATE_DURATION_MS,
  SKELETON_TRANSITIONS,
  allowedTransitions,
  createSkeletonFsmHost,
  createSkeletonStateMachine,
  createSkeletonStates,
} from '@entities/enemy/SkeletonStates';
import type { SkeletonStateId } from '@entities/enemy/SkeletonStateId';
import type { SkeletonFsmHost } from '@entities/enemy/SkeletonStates';

const ALL_IDS: readonly SkeletonStateId[] = [
  'IDLE',
  'PATROL',
  'ALERT',
  'CHASE',
  'WINDUP',
  'ATTACK',
  'RECOVER',
  'HURT',
  'DEATH',
];

function drive(
  from: SkeletonStateId,
  mutate: (host: SkeletonFsmHost) => void,
): { fsm: StateMachine<SkeletonFsmHost, SkeletonStateId>; host: SkeletonFsmHost } {
  const host = createSkeletonFsmHost();
  const fsm = createSkeletonStateMachine(host, from);
  mutate(host);
  fsm.update({ time: 0, delta: 16 });
  return { fsm, host };
}

describe('SkeletonStates — structure', () => {
  it('defines every SkeletonStateId exactly once', () => {
    const ids = createSkeletonStates().map(s => s.id);
    expect(ids.sort()).toEqual([...ALL_IDS].sort());
  });

  it('populates allowed for every state from the diagram edges', () => {
    for (const id of ALL_IDS) {
      const s = createSkeletonStates().find(x => x.id === id);
      expect(s).toBeDefined();
      expect(s!.allowed).toEqual(allowedTransitions(id));
    }
  });

  it('allows every diagram transition', () => {
    for (const edge of SKELETON_TRANSITIONS) {
      const allowed = allowedTransitions(edge.from);
      expect(allowed, `${edge.from} → ${edge.to}`).toContain(edge.to);
    }
  });

  it('rejects an illegal transition in dev', () => {
    const host = createSkeletonFsmHost();
    const states = createSkeletonStates().map(s =>
      s.id === 'IDLE' ? { ...s, update: (): SkeletonStateId => 'ATTACK' } : s,
    );
    const fsm = new StateMachine(host, states, 'IDLE');
    expect(() => fsm.update({ time: 0, delta: 16 })).toThrow(/not allowed/);
  });

  it('recover fits two Samurai combo hits but not the full three-hit combo', () => {
    // docs/06 §7.2.3: hit1 66+66=132, hit2 66+66=132 -> 264ms fits in 500ms recover.
    // Hit 3 adds 116+100=216, total 480ms before its own recovery -- 500ms window still
    // covers landing hit 3's active frames, but §6.1.3 explicitly calls the full combo
    // (880ms door-to-door incl. all three recoveries) too long to fully resolve within it.
    expect(SKELETON_STATE_DURATION_MS.RECOVER).toBe(500);
  });
});

describe('SkeletonStates — full cycle', () => {
  it('IDLE -> ALERT on seeing the player', () => {
    const { fsm } = drive('IDLE', h => (h.seesPlayer = true));
    expect(fsm.id).toBe('ALERT');
  });

  it('IDLE -> PATROL after the idle timer, absent a sighting', () => {
    const { fsm } = drive('IDLE', h => (h.idleElapsed = true));
    expect(fsm.id).toBe('PATROL');
  });

  it('PATROL -> ALERT on seeing the player, and never spontaneously returns to IDLE (no waypoints in M2)', () => {
    const { fsm: seen } = drive('PATROL', h => (h.seesPlayer = true));
    expect(seen.id).toBe('ALERT');

    const { fsm: unseen } = drive('PATROL', () => undefined);
    expect(unseen.id).toBe('PATROL');
  });

  it('ALERT -> CHASE once the "!" beat completes', () => {
    const { fsm } = drive('ALERT', h => {
      h.seesPlayer = true;
      h.alertElapsed = true;
    });
    expect(fsm.id).toBe('CHASE');
  });

  it('ALERT -> IDLE if the player is lost mid-alert', () => {
    const { fsm } = drive('ALERT', h => (h.seesPlayer = false));
    expect(fsm.id).toBe('IDLE');
  });

  it('CHASE -> WINDUP once in range and off cooldown', () => {
    const { fsm } = drive('CHASE', h => {
      h.seesPlayer = true;
      h.inAttackRange = true;
      h.attackOffCooldown = true;
    });
    expect(fsm.id).toBe('WINDUP');
  });

  it('CHASE stays put if in range but still on cooldown', () => {
    const { fsm } = drive('CHASE', h => {
      h.seesPlayer = true;
      h.inAttackRange = true;
      h.attackOffCooldown = false;
    });
    expect(fsm.id).toBe('CHASE');
  });

  it('CHASE -> IDLE on losing sight (no SEARCH state in M2)', () => {
    const { fsm } = drive('CHASE', h => (h.seesPlayer = false));
    expect(fsm.id).toBe('IDLE');
  });

  it('WINDUP -> ATTACK once the 600ms telegraph elapses', () => {
    const { fsm } = drive('WINDUP', h => (h.windupElapsed = true));
    expect(fsm.id).toBe('ATTACK');
  });

  it('WINDUP holds the telegraph until it elapses', () => {
    const { fsm } = drive('WINDUP', () => undefined);
    expect(fsm.id).toBe('WINDUP');
  });

  it('ATTACK -> RECOVER once the hitbox window elapses', () => {
    const { fsm } = drive('ATTACK', h => (h.activeElapsed = true));
    expect(fsm.id).toBe('RECOVER');
  });

  it('RECOVER -> CHASE if the player is still visible after the punish window', () => {
    const { fsm } = drive('RECOVER', h => {
      h.recoverElapsed = true;
      h.seesPlayer = true;
    });
    expect(fsm.id).toBe('CHASE');
  });

  it('RECOVER -> IDLE if the player is gone after the punish window', () => {
    const { fsm } = drive('RECOVER', h => {
      h.recoverElapsed = true;
      h.seesPlayer = false;
    });
    expect(fsm.id).toBe('IDLE');
  });

  it('a poise break sends every non-terminal state to HURT, even mid-WINDUP or mid-ATTACK', () => {
    for (const from of [
      'IDLE',
      'PATROL',
      'ALERT',
      'CHASE',
      'WINDUP',
      'ATTACK',
      'RECOVER',
    ] as const) {
      const { fsm } = drive(from, h => (h.poiseBroken = true));
      expect(fsm.id, `${from} -> HURT`).toBe('HURT');
    }
  });

  it('HURT -> CHASE once the 220ms stagger elapses, if the player is still seen', () => {
    const { fsm } = drive('HURT', h => {
      h.staggerElapsed = true;
      h.seesPlayer = true;
    });
    expect(fsm.id).toBe('CHASE');
  });

  it('HURT -> IDLE once staggered out, if the player is no longer seen', () => {
    const { fsm } = drive('HURT', h => {
      h.staggerElapsed = true;
      h.seesPlayer = false;
    });
    expect(fsm.id).toBe('IDLE');
  });

  it('hp <= 0 sends any state straight to DEATH, overriding a simultaneous poise break', () => {
    for (const from of ['IDLE', 'CHASE', 'WINDUP', 'ATTACK', 'RECOVER'] as const) {
      const { fsm } = drive(from, h => {
        h.poiseBroken = true;
        h.hp = 0;
      });
      expect(fsm.id, `${from} -> DEATH`).toBe('DEATH');
    }
  });

  it('HURT -> DEATH when hp drops to 0 during stagger', () => {
    const { fsm } = drive('HURT', h => (h.hp = 0));
    expect(fsm.id).toBe('DEATH');
  });

  it('DEATH is terminal — no update ever moves it', () => {
    const { fsm } = drive('DEATH', h => {
      h.seesPlayer = true;
      h.hp = 30;
    });
    expect(fsm.id).toBe('DEATH');
  });

  it('runs the full happy-path cycle: IDLE -> ALERT -> CHASE -> WINDUP -> ATTACK -> RECOVER -> CHASE', () => {
    const host = createSkeletonFsmHost();
    const fsm = createSkeletonStateMachine(host, 'IDLE');

    host.seesPlayer = true;
    fsm.update({ time: 0, delta: 16 });
    expect(fsm.id).toBe('ALERT');

    host.alertElapsed = true;
    fsm.update({ time: 16, delta: 16 });
    expect(fsm.id).toBe('CHASE');

    host.inAttackRange = true;
    fsm.update({ time: 32, delta: 16 });
    expect(fsm.id).toBe('WINDUP');

    host.windupElapsed = true;
    fsm.update({ time: 48, delta: 16 });
    expect(fsm.id).toBe('ATTACK');

    host.activeElapsed = true;
    fsm.update({ time: 64, delta: 16 });
    expect(fsm.id).toBe('RECOVER');

    host.recoverElapsed = true;
    fsm.update({ time: 80, delta: 16 });
    expect(fsm.id).toBe('CHASE');
  });
});
