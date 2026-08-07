export function assert(condition: unknown, message: string): asserts condition {
  if (import.meta.env.DEV && !condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}
