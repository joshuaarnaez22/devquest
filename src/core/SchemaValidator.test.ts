import { describe, expect, it } from 'vitest';
import { validate } from '@core/SchemaValidator';

describe('SchemaValidator', () => {
  it('accepts a matching object', () => {
    const schema = {
      type: 'object' as const,
      required: ['id'],
      properties: {
        id: { type: 'string' as const },
        hp: { type: 'number' as const },
      },
    };
    const result = validate({ id: 'slime', hp: 10 }, schema);
    expect(result.ok).toBe(true);
  });

  it('returns JSON-pointer paths for failures', () => {
    const schema = {
      type: 'object' as const,
      required: ['id'],
      properties: { id: { type: 'string' as const } },
    };
    const result = validate({ id: 3 }, schema);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.some(e => e.path === '/id')).toBe(true);
    }
  });

  it('reports missing required fields', () => {
    const schema = {
      type: 'object' as const,
      required: ['name'],
      properties: { name: { type: 'string' as const } },
    };
    const result = validate({}, schema);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error[0]?.path).toBe('/name');
    }
  });

  it('validates primitive types', () => {
    expect(validate(true, { type: 'boolean' }).ok).toBe(true);
    expect(validate(null, { type: 'null' }).ok).toBe(true);
    expect(validate('x', { type: 'number' }).ok).toBe(false);
  });

  it('validates nested arrays', () => {
    const schema = {
      type: 'array' as const,
      items: { type: 'integer' as const },
    };
    const bad = validate([1, 'x', 3], schema);
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.error.some(e => e.path === '/1')).toBe(true);
    }
  });
});
