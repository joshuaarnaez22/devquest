/** Opens an external URL — Codex only, with confirmation upstream (docs/12). */

export function openExternal(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}
