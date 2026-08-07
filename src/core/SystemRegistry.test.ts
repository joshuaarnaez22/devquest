import { describe, expect, it, vi } from 'vitest';
import { SystemRegistry } from '@core/SystemRegistry';
import type { System } from '@core/SystemRegistry';

function sys(id: string, overrides: Partial<System> = {}): System {
  return {
    id,
    enabled: true,
    init: vi.fn(),
    update: vi.fn(),
    postPhysics: vi.fn(),
    destroy: vi.fn(),
    ...overrides,
  };
}

describe('SystemRegistry', () => {
  it('runs init and update in declared order', () => {
    const order: string[] = [];
    const a = sys('a', {
      init: () => order.push('init:a'),
      update: () => order.push('update:a'),
    });
    const b = sys('b', {
      init: () => order.push('init:b'),
      update: () => order.push('update:b'),
    });
    const reg = new SystemRegistry([a, b], ['a', 'b']);
    reg.init();
    reg.update(0, 16);
    expect(order).toEqual(['init:a', 'init:b', 'update:a', 'update:b']);
  });

  it('destroys in reverse order', () => {
    const order: string[] = [];
    const a = sys('a', { destroy: () => order.push('a') });
    const b = sys('b', { destroy: () => order.push('b') });
    const reg = new SystemRegistry([a, b], ['a', 'b']);
    reg.destroy();
    expect(order).toEqual(['b', 'a']);
  });

  it('skips disabled systems and respects pause gating', () => {
    const a = sys('a');
    const ui = sys('ui', { runsWhilePaused: true });
    a.enabled = false;
    const reg = new SystemRegistry([a, ui], ['a', 'ui']);
    reg.setPaused(true);
    reg.update(0, 16);
    expect(a.update).not.toHaveBeenCalled();
    expect(ui.update).toHaveBeenCalled();
  });

  it('runs postPhysics with the same pause gating', () => {
    const ui = sys('ui', { runsWhilePaused: true });
    const sim = sys('sim');
    const reg = new SystemRegistry([ui, sim], ['ui', 'sim']);
    reg.setPaused(true);
    reg.postPhysics(0, 16);
    expect(ui.postPhysics).toHaveBeenCalled();
    expect(sim.postPhysics).not.toHaveBeenCalled();
  });

  it('get returns a registered system by id', () => {
    const a = sys('a');
    const reg = new SystemRegistry([a], ['a']);
    expect(reg.get('a')).toBe(a);
    expect(() => reg.get('missing')).toThrow(/not registered/);
  });

  it('throws when order references an unknown system', () => {
    expect(() => new SystemRegistry([sys('a')], ['missing'])).toThrow(/Unknown system/);
  });
});
