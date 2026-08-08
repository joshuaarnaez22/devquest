/**
 * Human-readable debug HUD — DOM, not BitmapText.
 * Lives in platform/ (browser APIs). Game scenes only call these helpers.
 */

export type DomHudPanelId = 'feel' | 'perf' | 'hint';

interface Panel {
  readonly el: HTMLPreElement;
}

const panels = new Map<DomHudPanelId, Panel>();
let host: HTMLDivElement | null = null;

const STYLE_ID = 'dq-debug-dom-style';

function ensureStyle(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID) !== null) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
#dq-debug-dom {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 20;
  overflow: hidden;
}
#dq-debug-dom .dq-panel {
  position: absolute;
  margin: 0;
  padding: 10px 12px;
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 14px;
  line-height: 1.4;
  font-weight: 600;
  color: #f2f0f5;
  background: rgba(13, 11, 20, 0.94);
  border: 1px solid #6b6878;
  border-radius: 4px;
  white-space: pre;
  letter-spacing: 0.03em;
  text-shadow: none;
  -webkit-font-smoothing: antialiased;
}
#dq-debug-dom .dq-panel[data-id="perf"] {
  border-color: #ffd23f;
  max-width: min(360px, 92vw);
}
#dq-debug-dom .dq-panel[data-id="feel"] {
  border-color: #8bb4d4;
  max-width: min(320px, 92vw);
}
#dq-debug-dom .dq-panel[data-id="hint"] {
  border-color: #474459;
  font-size: 13px;
  font-weight: 500;
  opacity: 0.95;
}
`;
  document.head.appendChild(style);
}

function ensureHost(): HTMLDivElement | null {
  if (typeof document === 'undefined') return null;
  ensureStyle();
  if (host !== null) return host;
  const parent = document.getElementById('game-root') ?? document.body;
  if (getComputedStyle(parent).position === 'static') {
    parent.style.position = 'relative';
  }
  host = document.createElement('div');
  host.id = 'dq-debug-dom';
  parent.appendChild(host);
  return host;
}

function ensurePanel(id: DomHudPanelId): Panel | null {
  const existing = panels.get(id);
  if (existing !== undefined) return existing;
  const root = ensureHost();
  if (root === null) return null;

  const el = document.createElement('pre');
  el.className = 'dq-panel';
  el.dataset['id'] = id;
  el.style.display = 'none';

  if (id === 'hint') {
    el.style.left = '12px';
    el.style.bottom = '12px';
    el.style.top = 'auto';
  } else if (id === 'feel') {
    el.style.right = '12px';
    el.style.top = '12px';
    el.style.left = 'auto';
  } else {
    el.style.left = '12px';
    el.style.top = '12px';
  }

  root.appendChild(el);
  const panel = { el };
  panels.set(id, panel);
  return panel;
}

/** Show/hide a panel. */
export function setDomHudVisible(id: DomHudPanelId, visible: boolean): void {
  const panel = ensurePanel(id);
  if (panel === null) return;
  panel.el.style.display = visible ? 'block' : 'none';
}

/** Replace panel body (plain text, newlines ok). */
export function setDomHudText(id: DomHudPanelId, text: string): void {
  const panel = ensurePanel(id);
  if (panel === null) return;
  panel.el.textContent = text;
}

/** Tear down all panels (scene shutdown). */
export function destroyDomHud(): void {
  for (const panel of panels.values()) {
    panel.el.remove();
  }
  panels.clear();
  host?.remove();
  host = null;
}
