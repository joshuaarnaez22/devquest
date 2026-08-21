import type { Knockback } from '@components/Knockback';
import type { EntityId } from '@core/GameEvents';
import type { System } from '@core/SystemRegistry';
import type { HitResolution } from '@systems/CombatSystem';

/** Minimal body surface — an Arcade Body satisfies this. */
export interface KnockbackBody {
  readonly velocity: { x: number; y: number };
}

interface Entry {
  readonly knockback: Knockback;
  readonly body: KnockbackBody;
}

/**
 * Applies the `Knockback` component's decaying impulse to a registered body every
 * frame (docs/07-Combat.md §6.4). Implements `CombatSinks.applyKnockback`'s exact
 * signature so it plugs into `CombatSystem`'s fan-out directly.
 *
 * `KNOCKBACK_IMPULSE_SCALE` is referenced in §6.4's illustrative code but never given
 * a value anywhere in the docs — `Knockback.step()` already defaults its own
 * `impulseScale` param to 1 (a no-op) for exactly this reason, so no separate constant
 * is introduced here. Flag for review if a real tuning value surfaces (M2-T13).
 */
export class KnockbackSystem implements System {
  readonly id = 'knockback';
  enabled = true;

  private readonly entries = new Map<EntityId, Entry>();

  register(id: EntityId, knockback: Knockback, body: KnockbackBody): void {
    this.entries.set(id, { knockback, body });
  }

  unregister(id: EntityId): void {
    this.entries.delete(id);
  }

  /** `CombatSinks.applyKnockback` — starts the impulse; a same-frame second hit replaces it (§9.3). */
  apply(victimId: EntityId, knockback: HitResolution['knockback']): void {
    const entry = this.entries.get(victimId);
    if (entry === undefined) return;
    entry.knockback.start(knockback.speed, knockback.dirX, knockback.liftY, knockback.decayMs);
  }

  /**
   * ADDS to velocity rather than overriding it (§6.4) — a moving victim keeps their
   * own input velocity underneath, so knockback never reads as a total loss of control.
   */
  postPhysics(_time: number, delta: number): void {
    for (const { knockback, body } of this.entries.values()) {
      if (!knockback.active) continue;
      body.velocity.x += knockback.step(delta);
      const lift = knockback.takeLift();
      if (lift !== 0) body.velocity.y = lift; // instantaneous — a decaying vertical force fights gravity
    }
  }

  destroy(): void {
    this.entries.clear();
  }
}
