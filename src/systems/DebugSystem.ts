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

/**
 * Production debug overlay — Ctrl+Shift+D (docs/01 §6.2, docs/15 §9.1).
 * M1: sparkline, system bars, pools, heap Δ60s, player readout, F8/F10.
 */
export class DebugSystem implements System {
  readonly id = 'debug';
  enabled = true;
  readonly runsWhilePaused = true;

  private scene: Phaser.Scene | null = null;
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
    },
  ): void {
    this.scene = scene;
    this.profiler = opts.profiler;
    this.pools = opts.pools;
    this.cam = opts.camera;
    Keyboard.ensureListening();

    // Full-bleed panel on the left — opaque so 4×6 glyphs stay readable.
    this.root = scene.add
      .container(0, 0)
      .setScrollFactor(0)
      .setDepth(Depth.DEBUG)
      .setVisible(false);
    this.panelGfx = scene.add.graphics().setScrollFactor(0);
    this.sparkGfx = scene.add.graphics().setScrollFactor(0);
    this.text = scene.add
      .bitmapText(4, 30, DEBUG_FONT_KEY, '', 6)
      .setTint(Palette.N7)
      .setScrollFactor(0);
    this.root.add([this.panelGfx, this.sparkGfx, this.text]);

    this.cullGfx = scene.add.graphics().setDepth(Depth.DEBUG).setVisible(false);
  }

  setPlayer(snap: DebugPlayerSnapshot | null): void {
    this.player = snap;
  }

  /** When frame-step is on, simulation runs only after F8 arms a step. */
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

  /** Call every Scene.update before deciding whether to simulate. */
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

  /** Record wall-clock frame length (call once per Scene.update). */
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
    this.scene = null;
    this.profiler = null;
    this.pools = null;
    this.cam = null;
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

    const body = this.buildText();
    label.setText(body);

    const panelW = 152;
    const panelH = Math.min(148, Math.max(90, label.height + 34));

    panel.clear();
    panel.fillStyle(Palette.N0, 0.92);
    panel.fillRect(0, 0, panelW, panelH);
    panel.lineStyle(1, Palette.N3, 1);
    panel.strokeRect(0, 0, panelW, panelH);

    gfx.clear();
    const n = this.frameRing.copyChronological(this.sparkScratch);
    const sparkX = 4;
    const sparkY = 4;
    const w = panelW - 8;
    const h = 22;
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
    const fps = frame > 0 ? 1000 / frame : 0;
    const lines: string[] = [
      `FPS ${fps.toFixed(0)}  ${frame.toFixed(1)} MS`,
      this.frameStepOn ? 'STEP ON  F8 STEP  ESC OUT' : 'F8 STEP  F10 CULL',
      '',
      'SYSTEMS MS',
    ];

    const profiler = this.profiler;
    if (profiler !== null) {
      const ids = ['input', 'vfx', 'particles', 'camera', 'debug'] as const;
      for (const id of ids) {
        const ms = profiler.sampleMs(id);
        lines.push(`${id.toUpperCase().padEnd(10)} ${ms.toFixed(2)}`);
      }
      if (!profiler.enabled) {
        lines.push('NO PROFILER');
      }
    }

    lines.push('', 'POOLS L/P/MAX');
    const pools = this.pools;
    if (pools !== null) {
      lines.push(fmtPool('DUST', pools.dustStats(), VFX.DUST_POOL_MAX));
      lines.push(fmtPool('GHOST', pools.afterimageStats(), VFX.AFTERIMAGE_POOL_MAX));
      lines.push(fmtPool('PART', pools.particleStats(), VFX.PARTICLE_POOL_MAX));
    }

    lines.push('', this.heapLine());

    const p = this.player;
    if (p !== null) {
      lines.push(
        '',
        `${p.hero.toUpperCase()}  ${p.state}`,
        `VX ${p.vx.toFixed(0)} VY ${p.vy.toFixed(0)} GND ${p.grounded ? 'Y' : 'N'}`,
      );
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
    return `HEAP ${formatHeapMb(cur)}  D60 ${sign}${formatHeapMb(Math.abs(delta))} ${ok}`;
  }

  private redrawCullMargins(): void {
    const gfx = this.cullGfx;
    const cam = this.cam;
    if (gfx === null || cam === null) return;
    gfx.clear();
    const view = cam.worldView;
    const activate = DEBUG.CULL_ACTIVATION_PX;
    const deactivate = DEBUG.CULL_DEACTIVATION_PX;

    gfx.lineStyle(1, Palette.G4, 0.7);
    gfx.strokeRect(
      view.x - activate,
      view.y - activate,
      view.width + activate * 2,
      view.height + activate * 2,
    );
    gfx.lineStyle(1, Palette.S0, 0.5);
    gfx.strokeRect(
      view.x - deactivate,
      view.y - deactivate,
      view.width + deactivate * 2,
      view.height + deactivate * 2,
    );
  }
}

function fmtPool(name: string, s: PoolStats, max: number): string {
  return `${name.padEnd(10)} ${s.live} / ${s.peak} / ${max}`;
}
