import { expand, GENEROSITY } from '@components/Box';
import type { BoxSpec } from '@components/Box';
import type { Hurtbox } from '@components/Hurtbox';
import type { PlayerStateId } from '@entities/player/PlayerStateId';
import type Phaser from 'phaser';

export const BODY_W = 14;
export const BODY_H = 28;
/** docs/07-Combat.md §5.3 — 60% height, bottom-aligned, uniform across heroes. */
export const CROUCH_BODY_H = 17;

export const STANDING_HURTBOX: BoxSpec = expand(
  { width: BODY_W, height: BODY_H, offsetX: 0, offsetY: -BODY_H / 2 },
  GENEROSITY.PLAYER_HURTBOX,
);
export const CROUCH_HURTBOX: BoxSpec = expand(
  { width: BODY_W, height: CROUCH_BODY_H, offsetX: 0, offsetY: -CROUCH_BODY_H / 2 },
  GENEROSITY.PLAYER_HURTBOX,
);

/** Shrink/restore body + hurtbox on CROUCH enter/exit (docs/06 §6.2).
 * Split out of `FeelPlayer.ts` (M2-T12, file-length budget). */
export function updateCrouch(
  body: Phaser.Physics.Arcade.Body,
  hurtbox: Hurtbox,
  prevId: PlayerStateId,
  curId: PlayerStateId,
): void {
  if (prevId === curId) return;
  if (curId === 'CROUCH') {
    body.setSize(BODY_W, CROUCH_BODY_H, false);
    body.setOffset(0, BODY_H - CROUCH_BODY_H);
    hurtbox.setSpec(CROUCH_HURTBOX);
  } else if (prevId === 'CROUCH') {
    body.setSize(BODY_W, BODY_H, false);
    body.setOffset(0, 0);
    hurtbox.setSpec(STANDING_HURTBOX);
  }
}
