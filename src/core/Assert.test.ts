import { describe, expect, it, vi } from 'vitest';
import { assert } from '@core/Assert';

describe('assert', () => {
  it('does not throw when condition is truthy', () => {
    expect(() => assert(true, 'nope')).not.toThrow();
  });

  it('throws in dev when condition is falsy', () => {
    expect(() => assert(false, 'bad invariant')).toThrow(/Assertion failed: bad invariant/);
  });

  it('is a no-op when DEV is false', () => {
    vi.stubEnv('DEV', false);
    expect(() => assert(false, 'ignored')).not.toThrow();
    vi.unstubAllEnvs();
  });
});
