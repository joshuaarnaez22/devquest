import { boxRect, type Aabb, type BoxSpec } from '@components/Box';
import type { EntityId } from '@core/GameEvents';

/**
 * Attack hitbox: a scheduled active window with per-activation victim dedup
 * (docs/07-Combat.md §5.1, §5.5). Pure — a system (M2-T3) reads `active`/`rect`
 * to enable and position the Arcade body; the component never touches physics.
 *
 * The `alreadyHit` set is the point of this class. An 83 ms active window is 5
 * physics frames at 60 fps, so without per-activation dedup a single swing deals
 * 5× damage — the most common combat bug in Phaser projects.
 */
export class Hitbox {
  private activeFlag = false;
  private activateAt = Infinity;
  private deactivateAt = Infinity;
  private instanceId = 0;
  private spec: BoxSpec | null = null;
  private readonly alreadyHit = new Set<EntityId>();

  /** Schedule a new activation `windupMs` out, lasting `activeMs`. Resets dedup. */
  schedule(now: number, windupMs: number, activeMs: number, spec: BoxSpec): void {
    this.activateAt = now + windupMs;
    this.deactivateAt = this.activateAt + activeMs;
    this.spec = spec;
    this.instanceId++;
    this.alreadyHit.clear();
    this.activeFlag = false;
  }

  /** Recompute the active window for `now`. Returns whether the box is live. */
  update(now: number): boolean {
    this.activeFlag = now >= this.activateAt && now < this.deactivateAt;
    return this.activeFlag;
  }

  get active(): boolean {
    return this.activeFlag;
  }

  /** Bumped on every `schedule` — identifies the current activation. */
  get instance(): number {
    return this.instanceId;
  }

  /** World AABB for the current spec, or a zero box before the first schedule. */
  rect(ownerX: number, ownerY: number, facing: -1 | 1): Aabb {
    if (this.spec === null) return { x: ownerX, y: ownerY, width: 0, height: 0 };
    return boxRect(this.spec, ownerX, ownerY, facing);
  }

  /** True if this activation has not already hit `victim`. */
  canHit(victim: EntityId): boolean {
    return !this.alreadyHit.has(victim);
  }

  markHit(victim: EntityId): void {
    this.alreadyHit.add(victim);
  }

  /** Immediate deactivation on cancel (dash/jump/damage) — no lingering hitbox (§5.5). */
  cancel(): void {
    this.activeFlag = false;
    this.deactivateAt = Math.min(this.deactivateAt, this.activateAt);
  }
}
