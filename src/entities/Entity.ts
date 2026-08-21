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
  private wasFrozen = false;
  private savedVelocityX = 0;
  private savedVelocityY = 0;
  /**
   * The entity's OWN pre-freeze `allowGravity`, not a hardcoded `true` — some
   * entities (`FeelPlayer`) permanently disable Arcade gravity and integrate it
   * manually (docs/03 §5.2). Restoring a hardcoded `true` would re-enable the
   * world's real gravity (`PHYSICS.GRAVITY_Y`, nonzero) underneath their own
   * per-frame math and double-apply it.
   */
  private savedAllowGravity = true;

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
    const body = this.arcadeBody();

    if (delta === 0) {
      // Frozen — hold position. Save once, on the frame we enter the freeze, so a
      // knockback in flight resumes cleanly rather than vanishing (docs/07 §6.2).
      if (body !== null && !this.wasFrozen) {
        this.savedVelocityX = body.velocity.x;
        this.savedVelocityY = body.velocity.y;
        this.savedAllowGravity = body.allowGravity;
        this.wasFrozen = true;
      }
      if (body !== null) {
        body.setVelocity(0, 0);
        body.allowGravity = false;
      }
      this.onFrozenTick();
      return;
    }

    if (this.wasFrozen) {
      if (body !== null) {
        body.setVelocity(this.savedVelocityX, this.savedVelocityY);
        body.allowGravity = this.savedAllowGravity;
      }
      this.wasFrozen = false;
    }
    this.onUpdate(time, delta);
  }

  private arcadeBody(): Phaser.Physics.Arcade.Body | null {
    const body = this.body;
    if (body !== null && 'setVelocity' in body && 'velocity' in body) {
      return body as Phaser.Physics.Arcade.Body;
    }
    return null;
  }

  /** Subclass gameplay tick — `delta` is already hit-stop-scaled. */
  protected abstract onUpdate(time: number, delta: number): void;

  /**
   * Runs every frame the entity is frozen, instead of `onUpdate` (docs/07 §6.2 P3
   * — "input during hit stop is buffered, applied on the first unfrozen frame").
   * `onUpdate` itself is skipped while frozen, so a subclass that needs to latch an
   * edge-triggered input (e.g. `FeelPlayer`'s attack/dash/special presses) so it is
   * not silently dropped overrides this to capture it. No-op by default.
   */
  protected onFrozenTick(): void {}

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
