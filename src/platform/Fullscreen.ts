export async function requestFullscreen(el: Element): Promise<boolean> {
  try {
    if (!document.fullscreenElement) {
      await el.requestFullscreen();
    }
    return true;
  } catch {
    return false;
  }
}

export async function exitFullscreen(): Promise<void> {
  if (document.fullscreenElement) {
    await document.exitFullscreen();
  }
}

export function isFullscreen(): boolean {
  return document.fullscreenElement !== null;
}
