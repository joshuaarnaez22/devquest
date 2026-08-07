import type { System, SystemId } from '@core/SystemRegistry';

/** Placeholder until the real system lands — keeps SYSTEM_ORDER stable. */
export class NoOpSystem implements System {
  enabled = true;

  constructor(readonly id: SystemId) {}
}
