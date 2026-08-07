export type StorageResult<T> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: StorageError };

export type StorageError = 'quota' | 'unavailable' | 'parse';

const PREFIX = 'devquest:';

export function get(key: string): StorageResult<string | null> {
  try {
    return { ok: true, value: localStorage.getItem(PREFIX + key) };
  } catch {
    return { ok: false, error: 'unavailable' };
  }
}

export function set(key: string, value: string): StorageResult<void> {
  try {
    localStorage.setItem(PREFIX + key, value);
    return { ok: true, value: undefined };
  } catch (e) {
    const name = e instanceof DOMException ? e.name : '';
    if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      return { ok: false, error: 'quota' };
    }
    return { ok: false, error: 'unavailable' };
  }
}

export function remove(key: string): StorageResult<void> {
  try {
    localStorage.removeItem(PREFIX + key);
    return { ok: true, value: undefined };
  } catch {
    return { ok: false, error: 'unavailable' };
  }
}
