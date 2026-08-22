import type { Aabb } from '@components/Box';
import type Phaser from 'phaser';

/** docs/07-Combat.md §11.4 — normative debug-overlay colours, `0xRRGGBB` + alpha. */
const COLOUR = {
  hitboxActive: 0x3fc4ff,
  hitboxActiveAlpha: 0.4,
  hitboxPendingAlpha: 0.12,
  playerHurtbox: 0x2fbf6b,
  playerHurtboxAlpha: 0.4,
  enemyHitbox: 0xc42b3a,
  enemyHitboxAlpha: 0.4,
  enemyHurtbox: 0xffd23f,
  enemyHurtboxAlpha: 0.3,
  iFrameOutline: 0x2fbf6b,
  hitStopBorder: 0xff2b2b,
  poiseBarBack: 0x000000,
  poiseBarFront: 0xffd23f,
} as const;

export interface CombatAttackBoxSnapshot {
  readonly rect: Aabb;
  readonly active: boolean;
  readonly pending: boolean;
}

export interface CombatEntityDebugSnapshot {
  readonly hurtbox: Aabb;
  readonly attackHitbox: CombatAttackBoxSnapshot | null;
  readonly iFramesActive: boolean;
  readonly hitStopFrozen: boolean;
  readonly poise: { readonly current: number; readonly max: number } | null;
}

export interface CombatDebugSnapshot {
  readonly player: CombatEntityDebugSnapshot;
  readonly enemies: readonly CombatEntityDebugSnapshot[];
  readonly queuedHits: number;
  readonly resolutionMs: number;
  readonly trauma: number;
  readonly liveDamageNumbers: number;
}

function strokeBorder(gfx: Phaser.GameObjects.Graphics, box: Aabb, colour: number): void {
  gfx.lineStyle(1, colour, 1);
  gfx.strokeRect(box.x - 1, box.y - 1, box.width + 2, box.height + 2);
}

function drawHurtbox(
  gfx: Phaser.GameObjects.Graphics,
  entity: CombatEntityDebugSnapshot,
  colour: number,
  alpha: number,
): void {
  gfx.fillStyle(colour, alpha);
  gfx.fillRect(entity.hurtbox.x, entity.hurtbox.y, entity.hurtbox.width, entity.hurtbox.height);
  if (entity.iFramesActive) strokeBorder(gfx, entity.hurtbox, COLOUR.iFrameOutline);
  if (entity.hitStopFrozen) strokeBorder(gfx, entity.hurtbox, COLOUR.hitStopBorder);
}

function drawAttackHitbox(gfx: Phaser.GameObjects.Graphics, box: CombatAttackBoxSnapshot): void {
  if (!box.active && !box.pending) return;
  const alpha = box.active ? COLOUR.hitboxActiveAlpha : COLOUR.hitboxPendingAlpha;
  gfx.fillStyle(COLOUR.hitboxActive, alpha);
  gfx.fillRect(box.rect.x, box.rect.y, box.rect.width, box.rect.height);
}

function drawPoiseBar(gfx: Phaser.GameObjects.Graphics, entity: CombatEntityDebugSnapshot): void {
  if (entity.poise === null) return;
  const y = entity.hurtbox.y - 4;
  const w = entity.hurtbox.width;
  gfx.fillStyle(COLOUR.poiseBarBack, 0.6);
  gfx.fillRect(entity.hurtbox.x, y, w, 1);
  const frac = entity.poise.max > 0 ? Math.max(0, entity.poise.current / entity.poise.max) : 0;
  gfx.fillStyle(COLOUR.poiseBarFront, 1);
  gfx.fillRect(entity.hurtbox.x, y, w * frac, 1);
}

/** Draws every box in docs/07 §11.4's table. `F9` toggles this layer (M2-T14). */
export function drawCombatBoxes(gfx: Phaser.GameObjects.Graphics, snap: CombatDebugSnapshot): void {
  gfx.clear();

  drawHurtbox(gfx, snap.player, COLOUR.playerHurtbox, COLOUR.playerHurtboxAlpha);
  if (snap.player.attackHitbox !== null) drawAttackHitbox(gfx, snap.player.attackHitbox);

  for (const enemy of snap.enemies) {
    drawHurtbox(gfx, enemy, COLOUR.enemyHurtbox, COLOUR.enemyHurtboxAlpha);
    if (enemy.attackHitbox !== null) {
      gfx.fillStyle(COLOUR.enemyHitbox, COLOUR.enemyHitboxAlpha);
      if (enemy.attackHitbox.active) {
        gfx.fillRect(
          enemy.attackHitbox.rect.x,
          enemy.attackHitbox.rect.y,
          enemy.attackHitbox.rect.width,
          enemy.attackHitbox.rect.height,
        );
      }
    }
    drawPoiseBar(gfx, enemy);
  }
}

/** Text stats appended to the `Ctrl+Shift+D` panel (docs/07 §11.4's "Plus a text readout"). */
export function combatDebugText(snap: CombatDebugSnapshot): string[] {
  return [
    '',
    'COMBAT',
    `  queued hits   ${snap.queuedHits}`,
    `  resolve time  ${snap.resolutionMs.toFixed(2)} ms`,
    `  trauma        ${snap.trauma.toFixed(2)}`,
    `  damage nums   ${snap.liveDamageNumbers}`,
  ];
}
