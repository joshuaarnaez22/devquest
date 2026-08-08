import { DEBUG } from '@config/DebugConstants';
import { Depth } from '@config/Depth';
import { Palette } from '@config/Palette';
import { VFX } from '@config/VfxConstants';
import { FrameTimeRing } from '@core/FrameTimeRing';
import { DEBUG_FONT_KEY } from '@platform/DebugBitmapFont';
import { formatHeapMb, heapUsedBytes } from '@platform/Heap';
import * as Keyboard from '@platform/Keyboard';
import type { PoolStats } from '@core/ObjectPool';
import type { Profiler } from '@core/Profiler';
import type { System } from '@core/SystemRegistry';
import type Phaser from 'phaser';

export interface DebugPlayerSnapshot {
  readonly hero: string;
  readonly state: string;
  readonly vx: number;
  readonly vy: number;
  readonly grounded: boolean;
}

export interface DebugPoolSource {
  dustStats(): PoolStats;
  afterimageStats(): PoolStats;
  particleStats(): PoolStats;
}

const PANEL_W = 128;
const PANEL_H = 140;
const FONT_SIZE = 8;

/**
 * Production debug overlay — Ctrl+Shift+D (docs/01 §6.2, docs/15 §9.1).
 * Opaque left panel + 5×7 font so labels stay human-readable at 320×180.
 */
export class DebugSystem implements System {
  readonly id = 'debug';
  enabled = true;
  readonly runsWhilePaused = true;

  private profiler: Profiler | null = null;
  private pools: DebugPoolSource | null = null;
  private cam: Phaser.Cameras.Scene2D.Camera | null = null;

  private overlayOn = false;
  private frameStepOn = false;
  private stepArmed = false;
  private cullVizOn = false;

  private readonly frameRing = new FrameTimeRing(DEBUG.SPARKLINE_FRAMES);
  private readonly sparkScratch: number[] = new Array<number>(DEBUG.SPARKLINE_FRAMES).fill(0);
  private readonly heapRing = new FrameTimeRing(DEBUG.HEAP_WINDOW_S);
  private heapAccMs = 0;

  private root: Phaser.GameObjects.Container | null = null;
  private panelGfx: Phaser.GameObjects.Graphics | null = null;
  private text: Phaser.GameObjects.BitmapText | null = null;
  private sparkGfx: Phaser.GameObjects.Graphics | null = null;
  private cullGfx: Phaser.GameObjects.Graphics | null = null;
  private onVisibility: ((visible: boolean) => void) | null = null;

  private player: DebugPlayerSnapshot | null = null;
  private prevToggle = false;
  private prevF8 = false;
  private prevF10 = false;
  private prevEsc = false;

  bind(
    scene: Phaser.Scene,
    opts: {
      readonly profiler: Profiler;
      readonly pools: DebugPoolSource;
      readonly camera: Phaser.Cameras.Scene2D.Camera;
      readonly onVisibility?: (visible: boolean) => void;
    },
  ): void {
    this.profiler = opts.profiler;
    this.pools = opts.pools;
    this.cam = opts.camera;
    this.onVisibility = opts.onVisibility ?? null;
    Keyboard.ensureListening();

    this.root = scene.add
      .container(0, 0)
      .setScrollFactor(0)
      .setDepth(Depth.DEBUG)
      .setVisible(false);

    this.panelGfx = scene.add.graphics().setScrollFactor(0);
    this.sparkGfx = scene.add.graphics().setScrollFactor(0);
    this.text = scene.add
      .bitmapText(3, 24, DEBUG_FONT_KEY, '', FONT_SIZE)
      .setTint(Palette.N7)
      .setScrollFactor(0);
    this.root.add([this.panelGfx, this.sparkGfx, this.text]);

    // World-space — below UI so boxes never slice through the panel.
    this.cullGfx = scene.add.graphics().setDepth(Depth.VFX_WORLD).setVisible(false);
  }

  setPlayer(snap: DebugPlayerSnapshot | null): void {
    this.player = snap;
  }

  allowsSimulation(): boolean {
    if (!this.frameStepOn) return true;
    if (!this.stepArmed) return false;
    this.stepArmed = false;
    return true;
  }

  get overlayVisible(): boolean {
    return this.overlayOn;
  }

  get cullMarginsVisible(): boolean {
    return this.cullVizOn;
  }

  get frameStepEnabled(): boolean {
    return this.frameStepOn;
  }

  pollHotkeys(): void {
    this.pollOverlayToggle();
    this.pollFrameStep();
    this.pollCullToggle();
  }

  private pollOverlayToggle(): void {
    const ctrl = Keyboard.isDown('ControlLeft') || Keyboard.isDown('ControlRight');
    const shift = Keyboard.isDown('ShiftLeft') || Keyboard.isDown('ShiftRight');
    const toggleHeld = ctrl && shift && Keyboard.isDown('KeyD');
    if (toggleHeld && !this.prevToggle) {
      this.overlayOn = !this.overlayOn;
      this.root?.setVisible(this.overlayOn);
      this.onVisibility?.(this.overlayOn);
    }
    this.prevToggle = toggleHeld;
  }

  private pollFrameStep(): void {
    const f8 = Keyboard.isDown('F8');
    if (f8 && !this.prevF8) {
      if (!this.frameStepOn) {
        this.frameStepOn = true;
        this.stepArmed = false;
      } else {
        this.stepArmed = true;
      }
    }
    this.prevF8 = f8;

    const esc = Keyboard.isDown('Escape');
    if (esc && !this.prevEsc && this.frameStepOn) {
      this.frameStepOn = false;
      this.stepArmed = false;
    }
    this.prevEsc = esc;
  }

  private pollCullToggle(): void {
    const f10 = Keyboard.isDown('F10');
    if (f10 && !this.prevF10) {
      this.cullVizOn = !this.cullVizOn;
      this.cullGfx?.setVisible(this.cullVizOn);
    }
    this.prevF10 = f10;
  }

  recordFrameMs(deltaMs: number): void {
    this.frameRing.push(deltaMs);
  }

  update(_time: number, delta: number): void {
    this.sampleHeap(delta);
    if (this.overlayOn) this.redrawOverlay();
    if (this.cullVizOn) this.redrawCullMargins();
  }

  destroy(): void {
    this.root?.destroy(true);
    this.cullGfx?.destroy();
    this.root = null;
    this.panelGfx = null;
    this.text = null;
    this.sparkGfx = null;
    this.cullGfx = null;
    this.profiler = null;
    this.pools = null;
    this.cam = null;
    this.onVisibility = null;
  }

  private sampleHeap(delta: number): void {
    this.heapAccMs += delta;
    if (this.heapAccMs < DEBUG.HEAP_SAMPLE_INTERVAL_MS) return;
    this.heapAccMs = 0;
    const bytes = heapUsedBytes();
    if (bytes !== null) this.heapRing.push(bytes);
  }

  private redrawOverlay(): void {
    const panel = this.panelGfx;
    const gfx = this.sparkGfx;
    const label = this.text;
    if (panel === null || gfx === null || label === null) return;

    label.setText(this.buildText());

    panel.clear();
    panel.fillStyle(Palette.N0, 1);
    panel.fillRect(0, 0, PANEL_W, PANEL_H);
    panel.lineStyle(1, Palette.S3, 1);
    panel.strokeRect(0, 0, PANEL_W, PANEL_H);

    gfx.clear();
    const n = this.frameRing.copyChronological(this.sparkScratch);
    const sparkX = 3;
    const sparkY = 3;
    const w = PANEL_W - 6;
    const h = 18;
    const maxMs = DEBUG.SPARKLINE_MAX_MS;
    const budgetY = sparkY + h * (1 - DEBUG.FRAME_BUDGET_MS / maxMs);

    gfx.fillStyle(Palette.N1, 1);
    gfx.fillRect(sparkX, sparkY, w, h);
    gfx.lineStyle(1, Palette.S3, 1);
    gfx.lineBetween(sparkX, budgetY, sparkX + w, budgetY);

    if (n > 0) {
      const barW = w / DEBUG.SPARKLINE_FRAMES;
      for (let i = 0; i < n; i++) {
        const ms = this.sparkScratch[i] ?? 0;
        const bh = Math.min(h, (ms / maxMs) * h);
        const color = ms > DEBUG.FRAME_BUDGET_MS ? Palette.S0 : Palette.C5;
        gfx.fillStyle(color, 1);
        gfx.fillRect(sparkX + i * barW, sparkY + h - bh, Math.max(1, barW - 0.5), bh);
      }
    }
  }

  private buildText(): string {
    const frame = this.frameRing.latest();
    const fps = frame > 0 ? Math.round(1000 / frame) : 0;
    const lines: string[] = [
      `${fps}FPS ${frame.toFixed(1)}MS`,
      this.frameStepOn ? 'STEP F8/ESC' : 'F8 STEP F10 CULL',
    ];

    const profiler = this.profiler;
    if (profiler !== null) {
      lines.push(
        `IN ${ms(profiler.sampleMs('input'))} VFX ${ms(profiler.sampleMs('vfx'))}`,
        `PT ${ms(profiler.sampleMs('particles'))} CAM ${ms(profiler.sampleMs('camera'))}`,
        `DBG ${ms(profiler.sampleMs('debug'))}`,
      );
    }

    const pools = this.pools;
    if (pools !== null) {
      lines.push(
        fmtPool('DUST', pools.dustStats(), VFX.DUST_POOL_MAX),
        fmtPool('GHOST', pools.afterimageStats(), VFX.AFTERIMAGE_POOL_MAX),
        fmtPool('PART', pools.particleStats(), VFX.PARTICLE_POOL_MAX),
      );
    }

    lines.push(this.heapLine());

    const p = this.player;
    if (p !== null) {
      lines.push(`${p.hero} ${p.state}`);
      lines.push(`VX${fmt(p.vx)} VY${fmt(p.vy)} ${p.grounded ? 'GND' : 'AIR'}`);
    }
    return lines.join('\n');
  }

  private heapLine(): string {
    if (this.heapRing.count === 0) return 'HEAP N/A';
    const cur = this.heapRing.latest();
    const samples: number[] = new Array<number>(this.heapRing.count).fill(0);
    this.heapRing.copyChronological(samples);
    const oldest = samples[0] ?? cur;
    const delta = cur - oldest;
    const sign = delta >= 0 ? '+' : '-';
    const ok = Math.abs(delta) < 512 * 1024 ? 'OK' : 'BAD';
    return `HEAP ${formatHeapMb(cur)}${sign}${formatHeapMb(Math.abs(delta))} ${ok}`;
  }

  private redrawCullMargins(): void {
    const gfx = this.cullGfx;
    const cam = this.cam;
    if (gfx === null || cam === null) return;
    gfx.clear();
    const view = cam.worldView;
    const activate = DEBUG.CULL_ACTIVATION_PX;
    const deactivate = DEBUG.CULL_DEACTIVATION_PX;

    gfx.lineStyle(1, Palette.G4, 0.55);
    gfx.strokeRect(
      view.x - activate,
      view.y - activate,
      view.width + activate * 2,
      view.height + activate * 2,
    );
    gfx.lineStyle(1, Palette.S0, 0.4);
    gfx.strokeRect(
      view.x - deactivate,
      view.y - deactivate,
      view.width + deactivate * 2,
      view.height + deactivate * 2,
    );
  }
}

function ms(n: number): string {
  return n.toFixed(1).padStart(4, ' ');
}

function fmt(n: number): string {
  return n.toFixed(0).padStart(4, ' ');
}

function fmtPool(name: string, s: PoolStats, max: number): string {
  return `${name} ${s.live}/${s.peak}/${max}`;
}
