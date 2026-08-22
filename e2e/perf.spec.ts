import { test, expect, type Page } from '@playwright/test';

/**
 * docs/15-Performance.md §9.2/§9.3 CI perf gates (M2-T15). The doc's own examples
 * target `?level=w1-1&bot=replay-1-1` / `w1-3` / Gorgon phase 4 — none of that
 * exists yet (real Tiled levels are M3, the Gorgon is M5). Scoped for now to what
 * M2 actually has: `GameScene`'s feel-test level + the one hardcoded Skeleton.
 * Re-target onto the doc's real level/bot list once that content lands.
 *
 * Chromium-only: both `performance.memory` (used by `src/platform/Heap.ts`) and
 * `newCDPSession` are Chrome-only APIs, so this suite skips on firefox/webkit.
 */

async function bootAndFocus(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('#game-root')).toBeVisible();
  await page.locator('body').click();
}

/** In-page `requestAnimationFrame` sampling — avoids parsing a CDP trace for
 * what's just consecutive frame deltas (docs/15 §9.2's own snippet leaves
 * `captureFrameTimes` unimplemented). */
async function captureFrameTimes(page: Page, durationMs: number): Promise<number[]> {
  return page.evaluate(
    ms =>
      new Promise<number[]>(resolve => {
        const samples: number[] = [];
        const start = performance.now();
        let last = start;
        function tick(t: number): void {
          samples.push(t - last);
          last = t;
          if (t - start < ms) requestAnimationFrame(tick);
          else resolve(samples);
        }
        requestAnimationFrame(tick);
      }),
    durationMs,
  );
}

function percentile(samples: readonly number[], p: number): number {
  const sorted = [...samples].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx] ?? 0;
}

async function heapUsedBytes(page: Page): Promise<number | null> {
  return page.evaluate(() => {
    const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
    return mem?.usedJSHeapSize ?? null;
  });
}

/** Walk into the Skeleton and spam attack — a stand-in for `bot=replay-combat-loop`
 * until a real replay-bot harness exists (M3+). Re-approaches every cycle so
 * knockback drift doesn't walk the fight apart. */
async function combatLoopTick(page: Page): Promise<void> {
  await page.keyboard.down('d');
  await page.waitForTimeout(120);
  await page.keyboard.up('d');
  await page.keyboard.down('j');
  await page.waitForTimeout(40);
  await page.keyboard.up('j');
  await page.waitForTimeout(80);
}

test.describe('Perf gates (chromium only)', () => {
  // Serial: the frame-time capture would otherwise race the 60s combat-loop test
  // in a parallel worker on the same machine, reading contention as a game spike.
  test.describe.configure({ mode: 'serial' });
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'CDP/performance.memory is Chrome-only',
  );

  test('p99 frame time holds budget at idle (docs/15 §9.2)', async ({ page }) => {
    await bootAndFocus(page);
    // Let the first-paint/compositor settle so that warm-up jank (not a real
    // per-frame simulation cost) doesn't register as the frame-time spike.
    await page.waitForTimeout(1_000);
    const frames = await captureFrameTimes(page, 5_000);
    expect(percentile(frames, 50)).toBeLessThanOrEqual(10);
    expect(percentile(frames, 99)).toBeLessThanOrEqual(16.67);
    expect(Math.max(...frames)).toBeLessThanOrEqual(33);
  });

  test('zero heap growth over 60s of combat (docs/15 §9.3)', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'performance.memory is Chrome-only');
    test.setTimeout(100_000);
    await bootAndFocus(page);

    const client = await page.context().newCDPSession(page);
    await client.send('HeapProfiler.enable');
    await client.send('HeapProfiler.collectGarbage');
    const before = await heapUsedBytes(page);
    expect(before).not.toBeNull();

    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      await combatLoopTick(page);
    }

    await client.send('HeapProfiler.collectGarbage');
    const after = await heapUsedBytes(page);
    expect(after).not.toBeNull();

    // Allow 512 KB of noise (Phaser internals, JIT) — docs/15 §9.3.
    expect((after ?? 0) - (before ?? 0)).toBeLessThan(512 * 1024);
  });
});
