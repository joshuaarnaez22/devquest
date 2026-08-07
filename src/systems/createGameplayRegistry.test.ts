import { describe, expect, it } from 'vitest';
import { SYSTEM_ORDER_GAMEPLAY, SYSTEM_ORDER_UI } from '@config/SystemOrder';
import { createGameplayRegistry, createGameplaySystems } from '@systems/createGameplayRegistry';
import { InputSystem } from '@systems/InputSystem';
import { NoOpSystem } from '@systems/NoOpSystem';

describe('SYSTEM_ORDER + gameplay registry', () => {
  it('declares input first and debug last', () => {
    expect(SYSTEM_ORDER_GAMEPLAY[0]).toBe('input');
    expect(SYSTEM_ORDER_GAMEPLAY[SYSTEM_ORDER_GAMEPLAY.length - 1]).toBe('debug');
    expect(SYSTEM_ORDER_UI).toEqual(['focus', 'toast', 'hud']);
  });

  it('creates one system per gameplay order id', () => {
    const systems = createGameplaySystems();
    expect(systems.map(s => s.id)).toEqual([...SYSTEM_ORDER_GAMEPLAY]);
    expect(systems[0]).toBeInstanceOf(InputSystem);
    expect(systems.find(s => s.id === 'camera')).toBeInstanceOf(NoOpSystem);
  });

  it('updates systems in declared SYSTEM_ORDER_GAMEPLAY order', () => {
    const order: string[] = [];
    const registry = createGameplayRegistry();
    for (const id of SYSTEM_ORDER_GAMEPLAY) {
      const sys = registry.get(id);
      sys.update = () => {
        order.push(id);
      };
    }
    registry.update(0, 16);
    expect(order).toEqual([...SYSTEM_ORDER_GAMEPLAY]);
  });

  it('destroys systems in reverse SYSTEM_ORDER_GAMEPLAY order', () => {
    const order: string[] = [];
    const registry = createGameplayRegistry();
    for (const id of SYSTEM_ORDER_GAMEPLAY) {
      const sys = registry.get(id);
      sys.destroy = () => {
        order.push(id);
      };
    }
    registry.destroy();
    expect(order).toEqual([...SYSTEM_ORDER_GAMEPLAY].reverse());
  });

  it('exposes InputSystem via get(input)', () => {
    const registry = createGameplayRegistry();
    const input = registry.get<InputSystem>('input');
    expect(input).toBeInstanceOf(InputSystem);
    expect(input.frame.moveX).toBe(0);
    registry.destroy();
  });
});
