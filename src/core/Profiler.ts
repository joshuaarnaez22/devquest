import { now } from '@platform/Clock';
import { isDev } from '@platform/Env';
import type { System } from '@core/SystemRegistry';

/**
 * Dev-only per-system timing — docs/15 §13.1.
 * Instrumentation is inlined under `import.meta.env.DEV` so production DCE
 * drops both the timing hooks and the strip-check sentinel.
 */
export class Profiler {
  private readonly lastMs = new Map<string, number>();

  get enabled(): boolean {
    return isDev;
  }

  wrap<T extends System>(sys: T): T {
    if (import.meta.env.DEV) {
      // Sentinel must only appear in this branch (tools/ci/check-profiler-stripped.mjs).
      void 'DQ_PROFILER_DEV_ONLY';
      const originalUpdate = sys.update?.bind(sys);
      const originalPost = sys.postPhysics?.bind(sys);

      if (originalUpdate !== undefined) {
        sys.update = (t, d) => {
          const start = now();
          originalUpdate(t, d);
          this.lastMs.set(sys.id, now() - start);
        };
      }
      if (originalPost !== undefined) {
        sys.postPhysics = (t, d) => {
          const start = now();
          originalPost(t, d);
          const prev = this.lastMs.get(sys.id) ?? 0;
          this.lastMs.set(sys.id, prev + (now() - start));
        };
      }
    }
    return sys;
  }

  /** Last recorded update cost for `id`, or 0. */
  sampleMs(id: string): number {
    return this.lastMs.get(id) ?? 0;
  }

  /** Snapshot of all recorded system ids → ms. */
  samples(): ReadonlyMap<string, number> {
    return this.lastMs;
  }
}
