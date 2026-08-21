import { HitFlash } from '@components/HitFlash';
import { IFrames } from '@components/IFrames';
import type { EventBus } from '@core/EventBus';
import type { EntityId, GameEventMap } from '@core/GameEvents';

/**
 * docs/07 §9.1 — universal across heroes (only `maxHp`/`knockbackTaken`/`poise` vary
 * per character, per `CharacterDefensiveData`). Kept local rather than in
 * `GameConstants.FEEL` since that block is ADR-023-locked to M1 movement feel; these
 * are M2 combat numbers.
 */
const DAMAGE_IFRAME_MS = 800;
const RESPAWN_IFRAME_MS = 1200;
const IFRAME_FLICKER_PERIOD_MS = 100;
/** Not specified beyond "flickers" — chosen dim-not-invisible so the player reads as
 * present but vulnerable-window-active, not as a rendering glitch. Flag if tuned. */
const IFRAME_FLICKER_ALPHA = 0.3;

/**
 * `FeelPlayer`'s i-frame/hit-flash/damage-event state (M2-T10), split out to keep
 * `FeelPlayer.ts` under the file-length budget — mirrors `AttackScheduler`/
 * `FrozenInputLatch`'s existing split of one concern into its own small class.
 * Owns nothing Phaser-specific; `FeelPlayer` still applies the visuals.
 */
export class PlayerDamage {
  readonly iFrames = new IFrames();
  readonly hitFlash = new HitFlash();
  private pendingDamaged = false;

  constructor(
    private readonly bus: EventBus<GameEventMap>,
    private readonly entityId: EntityId,
  ) {}

  tick(deltaMs: number): void {
    this.hitFlash.update(deltaMs);
  }

  get flashColour(): number | null {
    return this.hitFlash.currentColour();
  }

  /** i-frames flicker at a 100ms period while active (docs/07 §9.1). */
  flickerAlpha(t: number): number {
    if (!this.iFrames.isActive(t)) return 1;
    const on = Math.floor(t / IFRAME_FLICKER_PERIOD_MS) % 2 === 0;
    return on ? 1 : IFRAME_FLICKER_ALPHA;
  }

  /**
   * `CombatSinks.applyFlash` (not `applyStagger`) drives this — it must run
   * SYNCHRONOUSLY, in the same pass `CombatSystem.resolveQueuedHits` resolves the
   * batch, so a second same-frame hit (docs/07 §9.3, e.g. a melee swing landing
   * alongside contact damage) sees `iFrames.isActive()` already true and is skipped.
   * Granting i-frames from the hit-stop-deferred `applyStagger` sink instead would
   * let both hits through.
   */
  applyDamage(t: number, remainingHp: number): void {
    this.iFrames.grant(DAMAGE_IFRAME_MS, t);
    this.pendingDamaged = true;
    this.bus.emit('combat:playerDamaged', { amount: 0, source: this.entityId, remainingHp });
  }

  /** Edge-triggered, consumed once per FSM sync — mirrors `poiseBroken` on `SkeletonFsmHost`. */
  consumeDamaged(): boolean {
    const d = this.pendingDamaged;
    this.pendingDamaged = false;
    return d;
  }

  /** docs/07 §9.1 — 1200ms respawn i-frames, prevents spawn-camping. */
  grantRespawnIFrames(t: number): void {
    this.iFrames.grant(RESPAWN_IFRAME_MS, t);
  }
}
