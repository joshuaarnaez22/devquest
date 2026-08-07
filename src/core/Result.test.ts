import { describe, expect, it } from 'vitest';
import { Err, Ok } from '@core/Result';

describe('Result', () => {
  it('Ok carries a value with ok true', () => {
    const r = Ok(42);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(42);
  });

  it('Err carries an error with ok false', () => {
    const r = Err('fail');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('fail');
  });
});
