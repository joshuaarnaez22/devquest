import { SYSTEM_ORDER_GAMEPLAY } from '@config/SystemOrder';
import { SystemRegistry } from '@core/SystemRegistry';
import { CameraSystem } from '@systems/CameraSystem';
import { InputSystem } from '@systems/InputSystem';
import { NoOpSystem } from '@systems/NoOpSystem';
import { ParticleSystem } from '@systems/ParticleSystem';
import { VfxSystem } from '@systems/VfxSystem';
import type { GameplaySystemId } from '@config/SystemOrder';
import type { System } from '@core/SystemRegistry';

/**
 * Build the gameplay system list in {@link SYSTEM_ORDER_GAMEPLAY} order.
 * M1: real `input` + `vfx` + `particles` + `camera`; the rest are no-ops.
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
  if (id === 'vfx') {
    return new VfxSystem();
  }
  if (id === 'particles') {
    return new ParticleSystem();
  }
  if (id === 'camera') {
    return new CameraSystem();
  }
  return new NoOpSystem(id);
}
