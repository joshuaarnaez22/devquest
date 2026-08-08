/**
 * Optional Chrome `performance.memory` — null when unavailable.
 * Lives in platform/ so systems never touch browser globals directly.
 */
export function heapUsedBytes(): number | null {
  const perf = performance as Performance & {
    memory?: { usedJSHeapSize: number };
  };
  const mem = perf.memory;
  if (mem === undefined) return null;
  return mem.usedJSHeapSize;
}

export function formatHeapMb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}
