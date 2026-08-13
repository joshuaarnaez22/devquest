/** Hit-point pool. Trivial by design — docs/07-Combat.md §12. */
export class Health {
  private current: number;

  constructor(public readonly max: number) {
    this.current = max;
  }

  get value(): number {
    return this.current;
  }

  get normalised(): number {
    return this.current / this.max;
  }

  get isDead(): boolean {
    return this.current <= 0;
  }

  damage(amount: number): void {
    this.current = Math.max(0, this.current - amount);
  }

  heal(amount: number): void {
    this.current = Math.min(this.max, this.current + amount);
  }

  reset(): void {
    this.current = this.max;
  }
}
