import { describe, expect, it } from 'vitest';
import { CollisionGroup, COMBAT_OVERLAP_PAIRS } from '@config/CollisionGroups';

describe('CollisionGroup bitmask (§5.4)', () => {
  const values = Object.values(CollisionGroup);

  it('every group is a single distinct bit', () => {
    for (const v of values) {
      expect(v).toBeGreaterThan(0);
      expect(v & (v - 1)).toBe(0); // power of two
    }
    expect(new Set(values).size).toBe(values.length); // no collisions
  });
});

describe('COMBAT_OVERLAP_PAIRS (§5.4)', () => {
  it('reference only defined collision groups', () => {
    for (const pair of COMBAT_OVERLAP_PAIRS) {
      expect(CollisionGroup[pair.attacker]).toBeDefined();
      expect(CollisionGroup[pair.victim]).toBeDefined();
    }
  });

  it('never pair two body groups (entities pass through each other)', () => {
    const bodies = new Set<string>(['PLAYER_BODY', 'ENEMY_BODY']);
    const bodyToBody = COMBAT_OVERLAP_PAIRS.some(
      p => bodies.has(p.attacker) && bodies.has(p.victim),
    );
    expect(bodyToBody).toBe(false);
  });

  it('include the contact-damage pair so enemies still threaten by touch', () => {
    const contact = COMBAT_OVERLAP_PAIRS.find(p => p.source === 'contact');
    expect(contact).toEqual({
      attacker: 'ENEMY_BODY',
      victim: 'PLAYER_HURTBOX',
      source: 'contact',
    });
  });
});
