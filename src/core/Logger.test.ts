import { describe, expect, it, vi } from 'vitest';
import { log } from '@core/Logger';

describe('log', () => {
  it('warn and error always emit', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    log.warn('Test', 'warn msg');
    log.error('Test', 'err msg');
    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('debug is gated on DEV', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubEnv('DEV', false);
    log.debug('Test', 'hidden');
    expect(warnSpy).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
    warnSpy.mockRestore();
  });
});
