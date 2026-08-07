import type { GameEventMap } from '@core/GameEvents';

interface ListenerEntry {
  readonly fn: (payload: unknown) => void;
  readonly owner?: object;
}

export class EventBus<TMap = GameEventMap> {
  private readonly listeners = new Map<PropertyKey, ListenerEntry[]>();

  on<K extends keyof TMap>(event: K, fn: (payload: TMap[K]) => void, owner?: object): this {
    const key = event as PropertyKey;
    const list = this.listeners.get(key) ?? [];
    const entry: ListenerEntry =
      owner === undefined
        ? { fn: fn as (payload: unknown) => void }
        : { fn: fn as (payload: unknown) => void, owner };
    list.push(entry);
    this.listeners.set(key, list);
    return this;
  }

  off<K extends keyof TMap>(event: K, fn?: (payload: TMap[K]) => void, owner?: object): this {
    const key = event as PropertyKey;
    const list = this.listeners.get(key);
    if (list === undefined) return this;

    if (fn === undefined && owner === undefined) {
      this.listeners.delete(key);
      return this;
    }

    const castFn = fn as ((payload: unknown) => void) | undefined;
    const filtered = list.filter(entry => {
      const fnMatch = castFn === undefined || entry.fn === castFn;
      const ownerMatch = owner === undefined || entry.owner === owner;
      return !(fnMatch && ownerMatch);
    });
    if (filtered.length === 0) this.listeners.delete(key);
    else this.listeners.set(key, filtered);
    return this;
  }

  emit<K extends keyof TMap>(event: K, payload: TMap[K]): boolean {
    const list = this.listeners.get(event as PropertyKey);
    if (list === undefined || list.length === 0) return false;
    for (const entry of [...list]) {
      entry.fn(payload);
    }
    return true;
  }

  /** Removes every listener registered with the given owner (e.g. scene shutdown). */
  offAllFor(owner: object): void {
    for (const [event, list] of this.listeners.entries()) {
      const next = list.filter(entry => entry.owner !== owner);
      if (next.length === 0) this.listeners.delete(event);
      else this.listeners.set(event, next);
    }
  }
}
