import { now } from '@platform/Clock';
import { isDev } from '@platform/Env';
import type { System } from '@core/SystemRegistry';

/**
 * Dev-only per-system timing — docs/15 §13.1.
 * Per-frame cost only — never accumulates across frames.
 */
export class Profiler {
  private readonly lastMs = new Map<string, number>();

  get enabled(): boolean {
    return isDev;
  }

  wrap<T extends System>(sys: T): T {
    if (import.meta.env.DEV) {
      void 'DQ_PROFILER_DEV_ONLY';
      const originalUpdate = sys.update?.bind(sys);
      const originalPost = sys.postPhysics?.bind(sys);
      const id = sys.id;
      // Closure reset every update call — postPhysics adds into the same frame only.
      let updateMsThisFrame = 0;

      if (originalUpdate !== undefined) {
        sys.update = (t, d) => {
          const start = now();
          originalUpdate(t, d);
          updateMsThisFrame = now() - start;
          this.lastMs.set(id, updateMsThisFrame);
        };
      }
      if (originalPost !== undefined) {
        sys.postPhysics = (t, d) => {
          const start = now();
          originalPost(t, d);
          const postMs = now() - start;
          if (originalUpdate !== undefined) {
            this.lastMs.set(id, updateMsThisFrame + postMs);
          } else {
            this.lastMs.set(id, postMs);
          }
          updateMsThisFrame = 0;
        };
      }
    }
    return sys;
  }

  sampleMs(id: string): number {
    return this.lastMs.get(id) ?? 0;
  }

  samples(): ReadonlyMap<string, number> {
    return this.lastMs;
  }
}
