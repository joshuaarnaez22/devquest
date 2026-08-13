import { boxRect, type Aabb, type BoxSpec } from '@components/Box';

/**
 * Damage-receiving box (docs/07-Combat.md §5). Geometry only — per-swing dedup
 * lives on the attacker's Hitbox and invulnerability on IFrames. A disabled
 * hurtbox receives nothing, used while an entity is culled off-screen (§9.5).
 */
export class Hurtbox {
  private enabledFlag = true;

  constructor(private spec: BoxSpec) {}

  /** Swap geometry, e.g. the crouch hurtbox (§5.3). */
  setSpec(spec: BoxSpec): void {
    this.spec = spec;
  }

  get enabled(): boolean {
    return this.enabledFlag;
  }

  setEnabled(on: boolean): void {
    this.enabledFlag = on;
  }

  rect(ownerX: number, ownerY: number, facing: -1 | 1): Aabb {
    return boxRect(this.spec, ownerX, ownerY, facing);
  }
}
