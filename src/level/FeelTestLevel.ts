import { Depth } from '@config/Depth';
import { DISPLAY } from '@config/GameConstants';
import { GAP, HEIGHT } from '@config/LevelMetrics';
import { Palette } from '@config/Palette';
import { DEBUG_FONT_KEY } from '@platform/DebugBitmapFont';
import type Phaser from 'phaser';

const TILE = DISPLAY.TILE;
const PLATFORM_H = 8;
const SOFT_DROP = 32;
const SEGMENT = 48;

export interface FeelTestLevel {
  readonly solids: Phaser.Physics.Arcade.StaticGroup;
  readonly softs: Phaser.Physics.Arcade.StaticGroup;
  readonly worldWidth: number;
  readonly worldHeight: number;
  readonly spawn: { readonly x: number; readonly y: number };
  readonly floorY: number;
}

interface BuildCtx {
  scene: Phaser.Scene;
  solids: Phaser.Physics.Arcade.StaticGroup;
  softs: Phaser.Physics.Arcade.StaticGroup;
  x: number;
  floorY: number;
}

function solid(
  ctx: BuildCtx,
  box: { x: number; y: number; w: number; h: number },
  color: number,
): void {
  const rect = ctx.scene.add.rectangle(box.x + box.w / 2, box.y + box.h / 2, box.w, box.h, color);
  rect.setDepth(Depth.TILEMAP_BACK);
  ctx.scene.physics.add.existing(rect, true);
  ctx.solids.add(rect);
}

function soft(ctx: BuildCtx, x: number, y: number, w: number): void {
  const rect = ctx.scene.add.rectangle(x + w / 2, y + PLATFORM_H / 2, w, PLATFORM_H, Palette.G3);
  rect.setDepth(Depth.TILEMAP_BACK);
  ctx.scene.physics.add.existing(rect, true);
  ctx.softs.add(rect);
}

function label(scene: Phaser.Scene, x: number, y: number, text: string): void {
  scene.add
    .bitmapText(x, y, DEBUG_FONT_KEY, text, 6)
    .setOrigin(0.5, 1)
    .setDepth(Depth.DEBUG)
    .setTint(Palette.S3);
}

function addGap(ctx: BuildCtx, gap: number, name: string): void {
  const left = ctx.x;
  solid(ctx, { x: left, y: ctx.floorY, w: SEGMENT, h: PLATFORM_H }, Palette.N3);
  label(ctx.scene, left + SEGMENT + gap / 2, ctx.floorY - 4, name);
  soft(ctx, left + SEGMENT, ctx.floorY + SOFT_DROP, gap);
  ctx.x = left + SEGMENT + gap;
}

function addLedge(ctx: BuildCtx, rise: number, name: string): void {
  const left = ctx.x;
  solid(ctx, { x: left, y: ctx.floorY, w: SEGMENT, h: PLATFORM_H }, Palette.N3);
  const topY = ctx.floorY - rise;
  solid(ctx, { x: left + SEGMENT, y: topY, w: SEGMENT, h: PLATFORM_H }, Palette.N4);
  label(ctx.scene, left + SEGMENT + SEGMENT / 2, topY - 4, name);
  soft(ctx, left + SEGMENT, ctx.floorY + SOFT_DROP, SEGMENT);
  ctx.x = left + SEGMENT * 2;
  ctx.floorY = topY;
}

/**
 * Grey-box vocabulary course — every GAP_* / LEDGE_* / SHAFT from LevelMetrics.
 * Soft floors sit 32 px below gaps so failure is free (spike-00 / docs/10 §6.1).
 */
export function buildFeelTestLevel(scene: Phaser.Scene): FeelTestLevel {
  const solids = scene.physics.add.staticGroup();
  const softs = scene.physics.add.staticGroup();
  const floorY = DISPLAY.HEIGHT - TILE * 2;
  const ctx: BuildCtx = { scene, solids, softs, x: 0, floorY };

  solid(ctx, { x: 0, y: floorY, w: SEGMENT * 2, h: PLATFORM_H }, Palette.N5);
  const spawn = { x: SEGMENT, y: floorY - 14 };
  ctx.x = SEGMENT * 2;

  addGap(ctx, GAP.STEP, 'STEP');
  addGap(ctx, GAP.HOP, 'HOP');
  addGap(ctx, GAP.GAP_S, 'GAP_S');
  addGap(ctx, GAP.GAP_M, 'GAP_M');
  addGap(ctx, GAP.GAP_L, 'GAP_L');
  addGap(ctx, GAP.GAP_XL, 'GAP_XL');
  addGap(ctx, GAP.GAP_NINJA, 'GAP_NINJA');

  ctx.floorY = floorY;
  solid(ctx, { x: ctx.x, y: floorY, w: SEGMENT, h: PLATFORM_H }, Palette.N3);
  ctx.x += SEGMENT;

  addLedge(ctx, HEIGHT.LEDGE_S, 'LEDGE_S');
  addLedge(ctx, HEIGHT.LEDGE_M, 'LEDGE_M');
  addLedge(ctx, HEIGHT.LEDGE_L, 'LEDGE_L');
  addLedge(ctx, HEIGHT.LEDGE_XL, 'LEDGE_XL');
  addLedge(ctx, HEIGHT.SHAFT, 'SHAFT');
  addLedge(ctx, HEIGHT.LEDGE_NINJA, 'LEDGE_NINJA');

  solid(ctx, { x: ctx.x, y: ctx.floorY, w: SEGMENT * 2, h: PLATFORM_H }, Palette.N5);
  const worldWidth = ctx.x + SEGMENT * 2;
  const worldHeight = Math.max(DISPLAY.HEIGHT, floorY + SOFT_DROP + TILE * 4);

  scene.physics.world.setBounds(0, 0, worldWidth, worldHeight);

  return { solids, softs, worldWidth, worldHeight, spawn, floorY };
}
