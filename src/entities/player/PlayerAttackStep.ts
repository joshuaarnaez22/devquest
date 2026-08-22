import { SAMURAI_AIR_ATTACK, SAMURAI_COMBO } from '@entities/player/CharacterCombat';
import type { AttackStep } from '@components/AttackStep';
import type { Hitbox } from '@components/Hitbox';
import type { AttackScheduler } from '@entities/player/AttackScheduler';
import type { PlayerStateId } from '@entities/player/PlayerStateId';

/** The AttackStep a given attack state runs, or null for non-attack states. */
export function attackStepFor(id: PlayerStateId): AttackStep | null {
  switch (id) {
    case 'ATTACK_1':
      return SAMURAI_COMBO[0] ?? null;
    case 'ATTACK_2':
      return SAMURAI_COMBO[1] ?? null;
    case 'ATTACK_3':
      return SAMURAI_COMBO[2] ?? null;
    case 'AIR_ATTACK':
      return SAMURAI_AIR_ATTACK;
    default:
      return null;
  }
}

/** Begin the scheduler on attack-state entry, advance its hitbox, end on exit.
 * Split out of `FeelPlayer.ts` (M2-T11, file-length budget). */
export function updateAttack(
  attack: AttackScheduler,
  attackHitbox: Hitbox,
  ids: { readonly fsmId: PlayerStateId; readonly prevId: PlayerStateId },
  t: number,
): void {
  const step = attackStepFor(ids.fsmId);
  if (step !== null) {
    if (ids.prevId !== ids.fsmId) attack.begin(step, t, attackHitbox);
    attackHitbox.update(t);
  } else if (attack.active) {
    attack.end();
  }
}
