import type { Hitbox } from '@components/Hitbox';
import type { CombatHitSource } from '@config/CollisionGroups';
import type { EntityId, Vec2 } from '@core/GameEvents';

/**
 * A hit detected during the physics step, awaiting resolution afterward (§10.1, §12).
 * `step` (`AttackStep | EnemyAttackStep | null`) joins this in M2-T4, once those types
 * exist — it is not needed to queue or drain.
 */
export interface QueuedHit {
  readonly hitbox: Hitbox;
  readonly attackerId: EntityId;
  readonly victimId: EntityId;
  readonly point: Vec2;
  readonly source: CombatHitSource;
}

/**
 * Buffers hits produced by Arcade overlap callbacks during the physics step and
 * releases them only when explicitly drained afterward (§10.1). Resolving inside a
 * callback modifies velocity mid-step, corrupts the physics group when an entity is
 * pooled, and orders unpredictably — queuing eliminates all three. Priority ordering
 * (§9.3) is applied by CombatSystem on the drained batch in M2-T5, not here.
 */
export class HitQueue {
  private readonly pending: QueuedHit[] = [];

  /** Enqueue a detected overlap. Resolves nothing. */
  queue(hit: QueuedHit): void {
    this.pending.push(hit);
  }

  get size(): number {
    return this.pending.length;
  }

  /** Remove and return all queued hits in FIFO order, clearing the queue. */
  drain(): QueuedHit[] {
    const hits = this.pending.slice();
    this.pending.length = 0;
    return hits;
  }

  clear(): void {
    this.pending.length = 0;
  }
}
