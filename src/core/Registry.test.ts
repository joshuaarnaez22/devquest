import { describe, expect, it } from 'vitest';
import { Registry } from '@core/Registry';

interface TestServices {
  rng: { seed: number };
  bus: { id: string };
}

describe('Registry', () => {
  it('registers and retrieves services', () => {
    const reg = new Registry<TestServices>();
    reg.register('rng', { seed: 1 });
    expect(reg.get('rng').seed).toBe(1);
  });

  it('throws on double registration', () => {
    const reg = new Registry<TestServices>();
    reg.register('bus', { id: 'a' });
    expect(() => reg.register('bus', { id: 'b' })).toThrow(/already registered/);
  });

  it('has reports registration state', () => {
    const reg = new Registry<TestServices>();
    expect(reg.has('rng')).toBe(false);
    reg.register('rng', { seed: 0 });
    expect(reg.has('rng')).toBe(true);
  });

  it('throws on unknown key', () => {
    const reg = new Registry<TestServices>();
    expect(() => reg.get('rng')).toThrow(/not registered/);
  });
});
