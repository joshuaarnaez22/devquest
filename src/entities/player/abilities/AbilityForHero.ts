import { KnightGuard } from '@entities/player/abilities/KnightGuard';
import { NinjaShadow } from '@entities/player/abilities/NinjaShadow';
import { SamuraiIai } from '@entities/player/abilities/SamuraiIai';
import { WizardNova } from '@entities/player/abilities/WizardNova';
import type { CharacterId } from '@data/CharacterTypes';
import type { Ability } from '@entities/player/abilities/Ability';

/**
 * One `Ability` per hero (docs/06 §9.1 — "adding a fifth hero means adding a
 * fifth file here and one JSON"). A fresh instance every hero-switch —
 * `PlayerAbilitySlot.setAbility` unsubscribes the outgoing one's bus listeners
 * first, so nothing leaks across repeated F1–F4 presses.
 */
export function createAbilityFor(id: CharacterId): Ability {
  switch (id) {
    case 'knight':
      return new KnightGuard();
    case 'samurai':
      return new SamuraiIai();
    case 'ninja':
      return new NinjaShadow();
    case 'wizard':
      return new WizardNova();
  }
}
