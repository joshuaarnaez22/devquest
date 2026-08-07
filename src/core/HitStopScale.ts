import type { EntityId } from '@core/GameEvents';

/**
 * Hit-stop delta scaling. `HitStopSystem` (M2) implements this; M1 uses
 * {@link NullHitStop} so `Entity.update` already goes through the seam.
 *
 * Lives in `core` because entities must not import systems
 * (`docs/03-Technical-Architecture.md` §6.1).
 */
export interface HitStopScale {
  scaledDelta(id: EntityId, delta: number): number;
}

/** Pass-through — no freeze until M2. */
export const NullHitStop: HitStopScale = {
  scaledDelta(_id: EntityId, delta: number): number {
    return delta;
  },
};
