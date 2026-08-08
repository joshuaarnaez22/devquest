/** Debug overlay / culling viz — docs/15 §8.1, §9.1, §13.2. */
export const DEBUG = {
  SPARKLINE_FRAMES: 60,
  /** Y-axis clamp for the frame-time sparkline (ms). */
  SPARKLINE_MAX_MS: 33,
  FRAME_BUDGET_MS: 16.67,
  HEAP_SAMPLE_INTERVAL_MS: 1000,
  HEAP_WINDOW_S: 60,
  /** Enemy activation margin beyond camera (px). */
  CULL_ACTIVATION_PX: 400,
  /** Enemy deactivation margin (px) — hysteresis. */
  CULL_DEACTIVATION_PX: 560,
} as const;
