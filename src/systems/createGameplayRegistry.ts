import { SYSTEM_ORDER_GAMEPLAY } from '@config/SystemOrder';
import { SystemRegistry } from '@core/SystemRegistry';
import { CameraSystem } from '@systems/CameraSystem';
import { InputSystem } from '@systems/InputSystem';
import { NoOpSystem } from '@systems/NoOpSystem';
import type { GameplaySystemId } from '@config/SystemOrder';
import type { System } from '@core/SystemRegistry';

/**
 * Build the gameplay system list in {@link SYSTEM_ORDER_GAMEPLAY} order.
 * M1: real `input` + `camera`; the rest are no-ops until their milestones.
 */
export function createGameplaySystems(): System[] {
  return SYSTEM_ORDER_GAMEPLAY.map(id => createGameplaySystem(id));
}

export function createGameplayRegistry(): SystemRegistry {
  return new SystemRegistry(createGameplaySystems(), SYSTEM_ORDER_GAMEPLAY);
}

function createGameplaySystem(id: GameplaySystemId): System {
  if (id === 'input') {
    return new InputSystem();
  }
  if (id === 'camera') {
    return new CameraSystem();
  }
  return new NoOpSystem(id);
}
