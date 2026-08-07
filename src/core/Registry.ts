export class Registry<TServices extends object> {
  private readonly services = new Map<keyof TServices, unknown>();

  register<K extends keyof TServices>(key: K, value: TServices[K]): void {
    if (this.services.has(key)) {
      throw new Error(`Service already registered: ${String(key)}`);
    }
    this.services.set(key, value);
  }

  get<K extends keyof TServices>(key: K): TServices[K] {
    const service = this.services.get(key);
    if (service === undefined) {
      throw new Error(`Service not registered: ${String(key)}`);
    }
    return service as TServices[K];
  }

  has<K extends keyof TServices>(key: K): boolean {
    return this.services.has(key);
  }
}
