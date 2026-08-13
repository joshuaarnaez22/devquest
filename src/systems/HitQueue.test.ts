import { describe, expect, it } from 'vitest';
import { Hitbox } from '@components/Hitbox';
import { HitQueue, type QueuedHit } from '@systems/HitQueue';
import type { BoxSpec } from '@components/Box';

const SPEC: BoxSpec = { width: 20, height: 16, offsetX: 12, offsetY: 0 };

function makeHit(attackerId: number, victimId: number): QueuedHit {
  const hitbox = new Hitbox();
  hitbox.schedule(0, 0, 83, SPEC);
  return { hitbox, attackerId, victimId, point: { x: 0, y: 0 }, source: 'melee' };
}

describe('HitQueue — buffer during physics, resolve after (§10.1)', () => {
  it('queuing fills the buffer but resolves nothing on its own', () => {
    const q = new HitQueue();
    q.queue(makeHit(1, 2));
    q.queue(makeHit(1, 3));
    expect(q.size).toBe(2); // held, not resolved
  });

  it('drain returns every queued hit in FIFO order and empties the queue', () => {
    const q = new HitQueue();
    q.queue(makeHit(1, 2));
    q.queue(makeHit(1, 3));
    const drained = q.drain();
    expect(drained.map(h => h.victimId)).toEqual([2, 3]);
    expect(q.size).toBe(0);
  });

  it('draining twice yields nothing the second time', () => {
    const q = new HitQueue();
    q.queue(makeHit(1, 2));
    expect(q.drain()).toHaveLength(1);
    expect(q.drain()).toEqual([]);
  });

  it('clear discards without resolving', () => {
    const q = new HitQueue();
    q.queue(makeHit(1, 2));
    q.clear();
    expect(q.size).toBe(0);
  });

  it('the drained batch is a copy — mutating it does not touch the queue', () => {
    const q = new HitQueue();
    q.queue(makeHit(1, 2));
    const batch = q.drain();
    batch.length = 0;
    q.queue(makeHit(1, 4));
    expect(q.size).toBe(1); // unaffected by the caller mutating the batch
  });
});
