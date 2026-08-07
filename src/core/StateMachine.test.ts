import { describe, expect, it, vi } from 'vitest';
import { log } from '@core/Logger';
import { StateMachine } from '@core/StateMachine';
import type { State, StateContext } from '@core/StateMachine';

type Id = 'IDLE' | 'RUN' | 'DEATH';

const ctx = (delta = 16, time = 0): StateContext => ({ time, delta });

function makeStates(overrides?: Partial<State<object, Id>>): readonly State<object, Id>[] {
  const idle: State<object, Id> = {
    id: 'IDLE',
    allowed: ['RUN', 'DEATH'],
    update: () => 'RUN',
    ...overrides,
  };
  const run: State<object, Id> = {
    id: 'RUN',
    allowed: ['IDLE'],
    update: () => undefined,
  };
  const death: State<object, Id> = {
    id: 'DEATH',
    allowed: [],
    update: () => undefined,
  };
  return [idle, run, death];
}

describe('StateMachine', () => {
  describe('transitions', () => {
    it('allows a declared transition from update', () => {
      const sm = new StateMachine({}, makeStates(), 'IDLE');
      sm.update(ctx());
      expect(sm.id).toBe('RUN');
    });

    it('throws in dev on an undeclared transition', () => {
      const sm = new StateMachine(
        {},
        [
          {
            id: 'IDLE',
            allowed: ['RUN'],
            update: () => 'DEATH',
          },
          { id: 'RUN', allowed: ['IDLE'], update: () => undefined },
          { id: 'DEATH', allowed: [], update: () => undefined },
        ],
        'IDLE',
      );
      expect(() => sm.update(ctx())).toThrow(/not allowed/);
    });

    it('permits force() to bypass allowed', () => {
      const sm = new StateMachine({}, makeStates(), 'IDLE');
      sm.force('DEATH', ctx());
      expect(sm.id).toBe('DEATH');
    });

    it('ignores illegal transitions in production', () => {
      vi.stubEnv('DEV', false);
      const warnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {});
      const sm = new StateMachine(
        {},
        [
          {
            id: 'IDLE',
            allowed: ['RUN'],
            update: () => 'DEATH',
          },
          { id: 'RUN', allowed: ['IDLE'], update: () => undefined },
          { id: 'DEATH', allowed: [], update: () => undefined },
        ],
        'IDLE',
      );
      sm.update(ctx());
      expect(sm.id).toBe('IDLE');
      expect(warnSpy).toHaveBeenCalled();
      vi.unstubAllEnvs();
      warnSpy.mockRestore();
    });
  });

  describe('timeInState', () => {
    it('resets on transition', () => {
      const sm = new StateMachine(
        {},
        [
          { id: 'IDLE', allowed: ['RUN'], update: () => undefined },
          { id: 'RUN', allowed: ['IDLE'], update: () => undefined },
        ],
        'IDLE',
      );
      sm.update(ctx(10));
      expect(sm.timeInState).toBe(10);
      sm.force('RUN', ctx(5));
      expect(sm.timeInState).toBe(0);
    });

    it('accumulates delta while staying in state', () => {
      const sm = new StateMachine(
        {},
        [{ id: 'IDLE', allowed: [], update: () => undefined }],
        'IDLE',
      );
      sm.update(ctx(8));
      sm.update(ctx(4));
      expect(sm.timeInState).toBe(12);
    });
  });

  describe('lifecycle', () => {
    it('calls enter and exit hooks', () => {
      const enter = vi.fn();
      const exit = vi.fn();
      const sm = new StateMachine(
        {},
        [
          { id: 'IDLE', allowed: ['RUN'], update: () => 'RUN', exit },
          { id: 'RUN', allowed: [], update: () => undefined, enter },
        ],
        'IDLE',
      );
      sm.update(ctx());
      expect(exit).toHaveBeenCalled();
      expect(enter).toHaveBeenCalled();
    });
  });

  describe('history', () => {
    it('keeps a ring buffer of the last 16 states', () => {
      let flip = false;
      const sm = new StateMachine(
        {},
        [
          {
            id: 'IDLE',
            allowed: ['RUN'],
            update: () => {
              flip = !flip;
              return flip ? 'RUN' : 'IDLE';
            },
          },
          {
            id: 'RUN',
            allowed: ['IDLE'],
            update: () => {
              flip = !flip;
              return flip ? 'RUN' : 'IDLE';
            },
          },
        ],
        'IDLE',
      );
      for (let i = 0; i < 20; i++) sm.update(ctx());
      expect(sm.getHistory().length).toBe(16);
    });
  });

  describe('construction', () => {
    it('throws on duplicate or unknown states', () => {
      expect(
        () =>
          new StateMachine(
            {},
            [
              { id: 'IDLE', allowed: [], update: () => undefined },
              { id: 'IDLE', allowed: [], update: () => undefined },
            ],
            'IDLE',
          ),
      ).toThrow(/Duplicate state/);
      expect(() => new StateMachine({}, makeStates(), 'MISSING' as Id)).toThrow(/Unknown initial/);
    });

    it('no-ops when force targets the current state', () => {
      const sm = new StateMachine({}, makeStates(), 'IDLE');
      sm.force('IDLE', ctx());
      expect(sm.id).toBe('IDLE');
    });

    it('force to unknown state throws', () => {
      const sm = new StateMachine({}, makeStates(), 'IDLE');
      expect(() => sm.force('MISSING' as Id, ctx())).toThrow(/Unknown state/);
    });
  });
});
