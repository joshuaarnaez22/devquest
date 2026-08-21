import type { DamageNumberStyle } from '@config/CombatFeedback';
import type { Vec2 } from '@core/GameEvents';

/** §6.8: "Shows BLOCK instead of a number" — the one style with no numeric text. */
export function damageNumberText(damage: number, style: DamageNumberStyle): string {
  if (style === 'blocked') return 'BLOCK';
  return String(Math.round(damage));
}

/**
 * §6.8: "If a number spawns within 8px of a live one, offset it by 10px vertically."
 * Stacks against every live number within the proximity threshold, not just the
 * nearest — a third number landing where two already stacked goes above both.
 */
export function stackOffsetY(
  spawnPoint: Readonly<Vec2>,
  livePoints: readonly Readonly<Vec2>[],
  proximityPx = 8,
  offsetPx = 10,
): number {
  let conflicts = 0;
  for (const p of livePoints) {
    const dx = p.x - spawnPoint.x;
    const dy = p.y - spawnPoint.y;
    if (Math.hypot(dx, dy) < proximityPx) conflicts++;
  }
  return conflicts === 0 ? 0 : -conflicts * offsetPx; // stack upward
}
