import { SYSTEM_ORDER_GAMEPLAY } from '@config/SystemOrder';
import { Profiler } from '@core/Profiler';
import { SystemRegistry } from '@core/SystemRegistry';
import { CameraSystem } from '@systems/CameraSystem';
import { DebugSystem } from '@systems/DebugSystem';
import { InputSystem } from '@systems/InputSystem';
import { NoOpSystem } from '@systems/NoOpSystem';
import { ParticleSystem } from '@systems/ParticleSystem';
import { VfxSystem } from '@systems/VfxSystem';
import type { GameplaySystemId } from '@config/SystemOrder';
import type { System } from '@core/SystemRegistry';

export interface GameplaySystems {
  readonly registry: SystemRegistry;
  readonly profiler: Profiler;
}

/**
 * Build the gameplay system list in {@link SYSTEM_ORDER_GAMEPLAY} order.
 * M1: input, vfx, particles, camera, debug — rest are no-ops.
 */
export function createGameplaySystems(profiler: Profiler): System[] {
  return SYSTEM_ORDER_GAMEPLAY.map(id => profiler.wrap(createGameplaySystem(id)));
}

export function createGameplayRegistry(profiler = new Profiler()): GameplaySystems {
  return {
    profiler,
    registry: new SystemRegistry(createGameplaySystems(profiler), SYSTEM_ORDER_GAMEPLAY),
  };
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
  if (id === 'debug') {
    return new DebugSystem();
  }
  return new NoOpSystem(id);
}
