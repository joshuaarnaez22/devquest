import { DEBUG } from '@config/DebugConstants';
import { Depth } from '@config/Depth';
import { Palette } from '@config/Palette';
import { VFX } from '@config/VfxConstants';
import { FrameTimeRing } from '@core/FrameTimeRing';
import { setDomHudText, setDomHudVisible } from '@platform/DebugDomHud';
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

const SPARK_CHARS = '▁▂▃▄▅▆▇█';

/**
 * Production debug overlay — Ctrl+Shift+D (docs/01 §6.2, docs/15 §9.1).
 * Text is a DOM monospace panel (readable). Cull viz stays in Phaser.
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
  /** Smoothed frame time for stable FPS readout (not raw jitter). */
  private smoothFrameMs = 16.67;
  private displayAccMs = 0;
  private displayFps = 60;
  private displayFrameMs = 16.67;

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
      setDomHudVisible('perf', this.overlayOn);
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
    // EMA — display stays readable while sparkline keeps raw history.
    this.smoothFrameMs = this.smoothFrameMs * 0.9 + deltaMs * 0.1;
  }

  update(_time: number, delta: number): void {
    this.sampleHeap(delta);
    this.displayAccMs += delta;
    if (this.displayAccMs >= 250) {
      this.displayAccMs = 0;
      this.displayFrameMs = this.smoothFrameMs;
      this.displayFps = this.displayFrameMs > 0 ? Math.round(1000 / this.displayFrameMs) : 0;
    }
    if (this.overlayOn) {
      setDomHudText('perf', this.buildText());
    }
    if (this.cullVizOn) this.redrawCullMargins();
  }

  destroy(): void {
    setDomHudVisible('perf', false);
    setDomHudText('perf', '');
    this.cullGfx?.destroy();
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

  private buildText(): string {
    const lines: string[] = [
      'PERF',
      `${this.displayFps} fps   ${this.displayFrameMs.toFixed(1)} ms/frame  (smoothed)`,
      `budget ${DEBUG.FRAME_BUDGET_MS} ms`,
      this.sparkLine(),
      this.frameStepOn ? 'FRAME-STEP ON  —  F8 step, Esc exit' : 'F8 frame-step   F10 cull margins',
      '',
      'SYSTEMS (ms this frame)',
    ];

    const profiler = this.profiler;
    if (profiler !== null) {
      for (const id of ['input', 'vfx', 'particles', 'camera', 'debug'] as const) {
        lines.push(`  ${id.padEnd(10)} ${profiler.sampleMs(id).toFixed(2)}`);
      }
      if (!profiler.enabled) {
        lines.push('  (timing stripped in production build)');
      }
    }

    lines.push('', 'POOLS  live / peak / max');
    const pools = this.pools;
    if (pools !== null) {
      lines.push(fmtPool('dust', pools.dustStats(), VFX.DUST_POOL_MAX));
      lines.push(fmtPool('ghost', pools.afterimageStats(), VFX.AFTERIMAGE_POOL_MAX));
      lines.push(fmtPool('particle', pools.particleStats(), VFX.PARTICLE_POOL_MAX));
    }

    lines.push('', this.heapLine());

    const p = this.player;
    if (p !== null) {
      lines.push(
        '',
        `PLAYER  ${p.hero}  ${p.state}`,
        `  vx ${p.vx.toFixed(1)}   vy ${p.vy.toFixed(1)}   ${p.grounded ? 'grounded' : 'airborne'}`,
      );
    }
    return lines.join('\n');
  }

  private sparkLine(): string {
    const n = this.frameRing.copyChronological(this.sparkScratch);
    if (n === 0) return '';
    // Show last 40 samples so the line fits a normal panel width.
    const start = Math.max(0, n - 40);
    let out = '';
    for (let i = start; i < n; i++) {
      const msVal = this.sparkScratch[i] ?? 0;
      const t = Math.min(1, msVal / DEBUG.SPARKLINE_MAX_MS);
      const idx = Math.min(SPARK_CHARS.length - 1, Math.floor(t * (SPARK_CHARS.length - 1)));
      out += SPARK_CHARS[idx] ?? '▁';
    }
    return out;
  }

  private heapLine(): string {
    if (this.heapRing.count === 0) return 'HEAP  (unavailable in this browser)';
    const cur = this.heapRing.latest();
    const samples: number[] = new Array<number>(this.heapRing.count).fill(0);
    this.heapRing.copyChronological(samples);
    const oldest = samples[0] ?? cur;
    const delta = cur - oldest;
    const sign = delta >= 0 ? '+' : '-';
    // Only rising heap is a leak signal. GC drops are normal (Chrome / Phaser).
    // Live overlay allows ~2 MB noise; CI heap test is stricter after forced GC.
    const growing = delta > 2 * 1024 * 1024;
    const tag = growing ? 'GROWING' : 'stable';
    return `HEAP  ${formatHeapMb(cur)} MB   Δ60s ${sign}${formatHeapMb(Math.abs(delta))} MB  ${tag}`;
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

function fmtPool(name: string, s: PoolStats, max: number): string {
  return `  ${name.padEnd(10)} ${s.live} / ${s.peak} / ${max}`;
}
