import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '@core/EventBus';
import type { GameEventMap } from '@core/GameEvents';

describe('EventBus', () => {
  it('delivers typed payloads to listeners', () => {
    const bus = new EventBus<GameEventMap>();
    const hit = vi.fn();
    bus.on('combat:hit', hit);
    const payload: GameEventMap['combat:hit'] = {
      attacker: 1,
      victim: 2,
      damage: 5,
      kind: 'melee',
      point: { x: 0, y: 0 },
    };
    bus.emit('combat:hit', payload);
    expect(hit).toHaveBeenCalledWith(payload);
  });

  it('off removes a specific listener', () => {
    const bus = new EventBus<GameEventMap>();
    const fn = vi.fn();
    bus.on('system:resumed', fn);
    bus.off('system:resumed', fn);
    bus.emit('system:resumed', {});
    expect(fn).not.toHaveBeenCalled();
  });

  it('offAllFor removes listeners owned by an object', () => {
    const bus = new EventBus<GameEventMap>();
    const owner = {};
    const fn = vi.fn();
    bus.on('player:jumped', fn, owner);
    bus.offAllFor(owner);
    bus.emit('player:jumped', { fromCoyote: false });
    expect(fn).not.toHaveBeenCalled();
  });
});
