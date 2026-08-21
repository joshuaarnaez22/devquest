import { beforeEach, describe, expect, it } from 'vitest';
import { Entity, resetEntityIdCounter } from '@entities/Entity';
import type { EntityId } from '@core/GameEvents';
import type { HitStopScale } from '@core/HitStopScale';

class ProbeEntity extends Entity {
  readonly deltas: number[] = [];
  readonly frozenTicks: number[] = [];

  protected override onUpdate(_time: number, delta: number): void {
    this.deltas.push(delta);
  }

  protected override onFrozenTick(): void {
    this.frozenTicks.push(1);
  }
}

function frozenHitStop(frozenIds: ReadonlySet<EntityId>): HitStopScale {
  return {
    scaledDelta(id, delta) {
      return frozenIds.has(id) ? 0 : delta;
    },
  };
}

interface FakeBody {
  velocity: { x: number; y: number };
  allowGravity: boolean;
  enable: boolean;
  setVelocity(x: number, y: number): FakeBody;
}

function makeFakeBody(vx = 0, vy = 0, allowGravity = true): FakeBody {
  return {
    velocity: { x: vx, y: vy },
    allowGravity,
    enable: true,
    setVelocity(x: number, y: number) {
      this.velocity.x = x;
      this.velocity.y = y;
      return this;
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

  it('frozen entity receives 0 delta, skips onUpdate, and zeroes velocity', () => {
    const entity = makeProbe();
    entity.setHitStop(frozenHitStop(new Set([entity.id])));
    const body = makeFakeBody(10, 20);
    entity.body = body as never;

    entity.update(1000, 16.67);

    expect(entity.deltas).toEqual([]);
    expect(body.velocity.x).toBe(0);
    expect(body.velocity.y).toBe(0);
  });

  it('disables gravity while frozen and restores the ORIGINAL value on release (§6.2)', () => {
    const entity = makeProbe();
    const frozenIds = new Set([entity.id]);
    entity.setHitStop(frozenHitStop(frozenIds));
    // Player-like entity: gravity was already false before the freeze (custom gravity,
    // docs/03 §5.2). A hardcoded `true` restore would be wrong for it.
    const body = makeFakeBody(0, 0, false);
    entity.body = body as never;

    entity.update(1000, 16.67); // frozen frame
    expect(body.allowGravity).toBe(false);

    frozenIds.delete(entity.id);
    entity.update(1017, 16.67); // released
    expect(body.allowGravity).toBe(false); // restored to its own prior value, not `true`
  });

  it('restores a normal entity’s gravity to true if that was its state before freezing', () => {
    const entity = makeProbe();
    const frozenIds = new Set([entity.id]);
    entity.setHitStop(frozenHitStop(frozenIds));
    const body = makeFakeBody(0, 0, true);
    entity.body = body as never;

    entity.update(1000, 16.67);
    expect(body.allowGravity).toBe(false);

    frozenIds.delete(entity.id);
    entity.update(1017, 16.67);
    expect(body.allowGravity).toBe(true);
  });

  it('velocity in flight when the freeze starts survives intact after release', () => {
    const entity = makeProbe();
    const frozenIds = new Set([entity.id]);
    entity.setHitStop(frozenHitStop(frozenIds));
    const body = makeFakeBody(140, -60); // e.g. knockback in progress
    entity.body = body as never;

    entity.update(1000, 16.67);
    expect(body.velocity.x).toBe(0); // held at zero while frozen

    frozenIds.delete(entity.id);
    entity.update(1060, 16.67);
    expect(body.velocity.x).toBe(140); // restored, not lost
    expect(body.velocity.y).toBe(-60);
  });

  it('calls onFrozenTick every frozen frame instead of onUpdate (input buffering seam, P3)', () => {
    const entity = makeProbe();
    entity.setHitStop(frozenHitStop(new Set([entity.id])));
    entity.body = makeFakeBody() as never;

    entity.update(1000, 16.67);
    entity.update(1017, 16.67);

    expect(entity.frozenTicks).toHaveLength(2);
    expect(entity.deltas).toEqual([]);
  });

  it('allocateEntityId assigns unique ids', () => {
    const a = makeProbe();
    const b = makeProbe();
    expect(a.id).toBe(1);
    expect(b.id).toBe(2);
  });
});
