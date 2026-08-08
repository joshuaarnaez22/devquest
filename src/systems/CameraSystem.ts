import { CAMERA } from '@config/CameraConstants';
import { Rng } from '@core/Rng';
import { createCameraFollowState, tickCameraFollow, traumaOffset } from '@systems/cameraFollow';
import type { System } from '@core/SystemRegistry';
import type { CameraFollowState } from '@systems/cameraFollow';

/** Minimal camera surface — Phaser Camera satisfies this. */
export interface CameraHandle {
  scrollX: number;
  scrollY: number;
  width: number;
  height: number;
  setScroll(x: number, y: number): this;
  setBounds(x: number, y: number, width: number, height: number, centerOn?: boolean): this;
  setViewport(x: number, y: number, width: number, height: number): this;
  setRoundPixels(value: boolean): this;
  stopFollow(): this;
}

export interface CameraFollowTarget {
  readonly x: number;
  readonly y: number;
  readonly velocityX: number;
  readonly grounded: boolean;
  readonly facing: -1 | 1;
  readonly maxRunSpeed: number;
}

/**
 * Follow + trauma camera — docs/04 §10.2, docs/07 §6.6, M1-T15.
 * Bind a Phaser camera from the scene; call {@link syncFollow} after player grounded sync.
 */
export class CameraSystem implements System {
  readonly id = 'camera';
  enabled = true;

  static readonly DECAY_PER_SEC = CAMERA.TRAUMA_DECAY_PER_SEC;
  static readonly MAX_OFFSET_PX = CAMERA.TRAUMA_MAX_OFFSET_PX;
  static readonly MAX_TRAUMA = CAMERA.TRAUMA_MAX;

  private camera: CameraHandle | null = null;
  private target: CameraFollowTarget | null = null;
  private boundsW = 0;
  private boundsH = 0;
  private follow: CameraFollowState = createCameraFollowState();
  private trauma = 0;
  private reducedMotion = false;
  private readonly rng = new Rng(0xca11e1a);
  private lastDeltaMs = 1000 / 60;

  bind(camera: CameraHandle, worldWidth: number, worldHeight: number): void {
    this.camera = camera;
    this.boundsW = worldWidth;
    this.boundsH = worldHeight;
    camera.setRoundPixels(true);
    camera.setViewport(CAMERA.VIEWPORT_X, CAMERA.VIEWPORT_Y, CAMERA.VIEWPORT_W, CAMERA.VIEWPORT_H);
    camera.setBounds(0, 0, worldWidth, worldHeight);
    camera.stopFollow();
    this.follow = createCameraFollowState(camera.scrollX, camera.scrollY);
  }

  setTarget(target: CameraFollowTarget | null): void {
    this.target = target;
  }

  setReducedMotion(enabled: boolean): void {
    this.reducedMotion = enabled;
  }

  /** Trauma accumulation — unused in M1 combat; scaffold for M2 (docs/07 §6.6). */
  addTrauma(amount: number): void {
    this.trauma = Math.min(this.trauma + amount, CameraSystem.MAX_TRAUMA);
  }

  get traumaLevel(): number {
    return this.trauma;
  }

  /** Snap scroll to target immediately (spawn / room enter). */
  snapToTarget(): void {
    const cam = this.camera;
    const target = this.target;
    if (cam === null || target === null) return;
    const focusX = target.x;
    const focusY = target.y + CAMERA.FOLLOW_OFFSET_Y;
    this.follow.scrollX = clampScroll(focusX - cam.width / 2, this.boundsW, cam.width);
    this.follow.scrollY = clampScroll(focusY - cam.height / 2, this.boundsH, cam.height);
    this.follow.lookAheadX = 0;
    this.follow.snapBlend = 1;
    this.follow.wasGrounded = target.grounded;
    this.follow.fallAnchorY = null;
    cam.setScroll(this.follow.scrollX, this.follow.scrollY);
  }

  update(_time: number, delta: number): void {
    this.lastDeltaMs = delta;
    if (this.trauma > 0) {
      this.trauma = Math.max(0, this.trauma - CameraSystem.DECAY_PER_SEC * (delta / 1000));
    }
  }

  /**
   * After player grounded sync — deadzone follow, look-ahead, fall snap, trauma.
   */
  syncFollow(deltaMs = this.lastDeltaMs): void {
    const cam = this.camera;
    const target = this.target;
    if (cam === null || target === null) return;

    tickCameraFollow(this.follow, {
      playerX: target.x,
      playerY: target.y,
      playerVx: target.velocityX,
      grounded: target.grounded,
      facing: target.facing,
      maxRunSpeed: target.maxRunSpeed,
      viewW: cam.width,
      viewH: cam.height,
      boundsW: this.boundsW,
      boundsH: this.boundsH,
      deltaMs,
    });

    let ox = 0;
    let oy = 0;
    if (this.trauma > 0 && !this.reducedMotion) {
      const off = traumaOffset(this.trauma, this.rng.nextFloat(), this.rng.nextFloat());
      ox = off.ox;
      oy = off.oy;
    }

    cam.setScroll(this.follow.scrollX + ox, this.follow.scrollY + oy);
  }

  destroy(): void {
    this.camera = null;
    this.target = null;
  }
}

function clampScroll(scroll: number, bounds: number, view: number): number {
  const max = Math.max(0, bounds - view);
  return Math.max(0, Math.min(max, scroll));
}
