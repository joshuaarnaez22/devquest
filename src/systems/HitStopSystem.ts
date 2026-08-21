import { now } from '@platform/Clock';
import type { EntityId } from '@core/GameEvents';
import type { HitStopScale } from '@core/HitStopScale';

/**
 * Freezes attacker + victim on a hit, never the rest of the scene (docs/07-Combat.md
 * §6.2, P2). A single global `freezeUntil` — not per-entity — matches the doc's own
 * `request()` sample exactly: **longest wins, never additive**. Two overlapping
 * requests extend the shared deadline to the later of the two; they do not sum.
 *
 * Implements `HitStopScale` so `Entity.update()` (the seam wired in M1) can consume
 * it directly via `setHitStop()`, and matches `CombatSinks.requestHitStop`'s exact
 * signature (M2-T5) so it plugs into `CombatSystem`'s fan-out without an adapter.
 */
export class HitStopSystem implements HitStopScale {
  private freezeUntil = 0;
  private readonly frozen = new Set<EntityId>();

  request(durationMs: number, participants: readonly EntityId[]): void {
    const end = now() + durationMs;
    if (end > this.freezeUntil) this.freezeUntil = end;
    for (const id of participants) this.frozen.add(id);
  }

  /** True only for a participant of the current freeze, before it has elapsed. */
  isFrozen(id: EntityId): boolean {
    if (now() >= this.freezeUntil) {
      if (this.frozen.size > 0) this.frozen.clear(); // window over — release everyone at once
      return false;
    }
    return this.frozen.has(id);
  }

  scaledDelta(id: EntityId, delta: number): number {
    return this.isFrozen(id) ? 0 : delta;
  }
}
