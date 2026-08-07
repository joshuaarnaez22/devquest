export const isDev: boolean = import.meta.env.DEV;

export const isSteam: boolean = false;

/** Boot straight into the feel-test GameScene (`npm run level:test`). */
export function isLevelTest(): boolean {
  if (import.meta.env['VITE_LEVEL_TEST'] === '1') return true;
  return new URLSearchParams(window.location.search).has('level');
}

export function browserName(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'firefox';
  if (ua.includes('Edg/')) return 'edge';
  if (ua.includes('Chrome')) return 'chrome';
  if (ua.includes('Safari')) return 'safari';
  return 'unknown';
}
