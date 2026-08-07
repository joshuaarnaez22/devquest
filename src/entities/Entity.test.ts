import { beforeEach, describe, expect, it } from 'vitest';
import { Entity, resetEntityIdCounter } from '@entities/Entity';
import type { EntityId } from '@core/GameEvents';
import type { HitStopScale } from '@core/HitStopScale';

class ProbeEntity extends Entity {
  readonly deltas: number[] = [];

  protected override onUpdate(_time: number, delta: number): void {
    this.deltas.push(delta);
  }
}

function frozenHitStop(frozenIds: ReadonlySet<EntityId>): HitStopScale {
  return {
    scaledDelta(id, delta) {
      return frozenIds.has(id) ? 0 : delta;
    },
  };
}

function makeProbe(): ProbeEntity {
  // Scene is unused by the Vitest Phaser stub / Entity base constructor path under test.
  return new ProbeEntity(null as never, 0, 0, 'probe');
}

describe('Entity', () => {
  beforeEach(() => {
    resetEntityIdCounter(1);
  });

  it('subclass receives hit-stop-scaled delta (NullHitStop passes through)', () => {
    const entity = makeProbe();
    entity.update(1000, 16.67);
    expect(entity.deltas).toEqual([16.67]);
  });

  it('frozen entity receives 0 delta and skips onUpdate', () => {
    const entity = makeProbe();
    entity.setHitStop(frozenHitStop(new Set([entity.id])));

    let velocityX = 10;
    let velocityY = 20;
    entity.body = {
      setVelocity(x: number, y: number) {
        velocityX = x;
        velocityY = y;
        return this;
      },
      enable: true,
    } as never;

    entity.update(1000, 16.67);

    expect(entity.deltas).toEqual([]);
    expect(velocityX).toBe(0);
    expect(velocityY).toBe(0);
  });

  it('allocateEntityId assigns unique ids', () => {
    const a = makeProbe();
    const b = makeProbe();
    expect(a.id).toBe(1);
    expect(b.id).toBe(2);
  });
});
