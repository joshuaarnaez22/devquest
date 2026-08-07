import Phaser from 'phaser';
import { NullHitStop } from '@core/HitStopScale';
import type { EntityId } from '@core/GameEvents';
import type { HitStopScale } from '@core/HitStopScale';
import type { Poolable } from '@core/ObjectPool';

let nextEntityId = 1;

export function allocateEntityId(): EntityId {
  const id = nextEntityId;
  nextEntityId += 1;
  return id;
}

/** Test-only — keeps unit tests deterministic. */
export function resetEntityIdCounter(next = 1): void {
  nextEntityId = next;
}

/**
 * Thin base between `Phaser.GameObjects.Sprite` and concrete entities.
 * Owns id, Arcade body access, pool contract, and hit-stop-scaled delta.
 * Does not own health, FSM, or animation (`docs/03-Technical-Architecture.md` P2).
 */
export abstract class Entity extends Phaser.GameObjects.Sprite implements Poolable {
  readonly id: EntityId;
  protected hitStop: HitStopScale = NullHitStop;

  constructor(scene: Phaser.Scene, x: number, y: number, textureKey: string) {
    super(scene, x, y, textureKey);
    this.id = allocateEntityId();
    this.setActive(false);
    this.setVisible(false);
  }

  /** Swap in `HitStopSystem` when M2 lands. */
  setHitStop(hitStop: HitStopScale): void {
    this.hitStop = hitStop;
  }

  override update(time: number, rawDelta: number): void {
    const delta = this.hitStop.scaledDelta(this.id, rawDelta);
    if (delta === 0) {
      // Frozen — hold position. Velocity save/restore lands with HitStopSystem (M2).
      // See docs/07-Combat.md §6.2 and docs/03-Technical-Architecture.md §8.4.
      const body = this.body;
      if (body !== null && 'setVelocity' in body) {
        (body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      }
      return;
    }
    this.onUpdate(time, delta);
  }

  /** Subclass gameplay tick — `delta` is already hit-stop-scaled. */
  protected abstract onUpdate(time: number, delta: number): void;

  reset(): void {
    this.setActive(true);
    this.setVisible(true);
    const body = this.body;
    if (body !== null && 'enable' in body) {
      (body as Phaser.Physics.Arcade.Body).enable = true;
    }
  }

  onDespawn(): void {
    this.setActive(false);
    this.setVisible(false);
    const body = this.body;
    if (body !== null && 'enable' in body) {
      (body as Phaser.Physics.Arcade.Body).enable = false;
    }
  }
}
