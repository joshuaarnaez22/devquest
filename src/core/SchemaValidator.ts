import { Err, Ok } from '@core/Result';
import type { Result } from '@core/Result';

export type JsonSchema =
  | { readonly type: 'string' }
  | { readonly type: 'number' }
  | { readonly type: 'boolean' }
  | { readonly type: 'integer' }
  | { readonly type: 'null' }
  | { readonly type: 'array'; readonly items: JsonSchema }
  | {
      readonly type: 'object';
      readonly properties?: Readonly<Record<string, JsonSchema>>;
      readonly required?: readonly string[];
    };

export interface ValidationIssue {
  readonly path: string;
  readonly message: string;
}

type PrimitiveType = 'string' | 'number' | 'boolean' | 'integer' | 'null';

const PRIM_OK: Record<PrimitiveType, (v: unknown) => boolean> = {
  string: v => typeof v === 'string',
  number: v => typeof v === 'number' && !Number.isNaN(v),
  integer: v => typeof v === 'number' && Number.isInteger(v),
  boolean: v => typeof v === 'boolean',
  null: v => v === null,
};

function pointer(base: string, segment: string): string {
  if (segment === '') return base || '/';
  if (base === '') return `/${segment}`;
  return `${base}/${segment}`;
}

function checkArray(value: unknown, items: JsonSchema, path: string): readonly ValidationIssue[] {
  if (!Array.isArray(value)) return [{ path: path || '/', message: 'expected array' }];
  const issues: ValidationIssue[] = [];
  value.forEach((item, index) => {
    const child = validate(item, items, pointer(path, String(index)));
    if (!child.ok) issues.push(...child.error);
  });
  return issues;
}

function checkObject(
  value: unknown,
  schema: Extract<JsonSchema, { type: 'object' }>,
  path: string,
): readonly ValidationIssue[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return [{ path: path || '/', message: 'expected object' }];
  }
  const record = value as Record<string, unknown>;
  const issues: ValidationIssue[] = [];
  for (const key of schema.required ?? []) {
    if (!(key in record)) {
      issues.push({ path: pointer(path, key), message: 'required property missing' });
    }
  }
  for (const [key, childSchema] of Object.entries(schema.properties ?? {})) {
    if (key in record) {
      const child = validate(record[key], childSchema, pointer(path, key));
      if (!child.ok) issues.push(...child.error);
    }
  }
  return issues;
}

export function validate(
  value: unknown,
  schema: JsonSchema,
  path = '',
): Result<unknown, readonly ValidationIssue[]> {
  let issues: readonly ValidationIssue[] = [];

  if (schema.type === 'array') {
    issues = checkArray(value, schema.items, path);
  } else if (schema.type === 'object') {
    issues = checkObject(value, schema, path);
  } else if (!PRIM_OK[schema.type](value)) {
    issues = [{ path: path || '/', message: `expected ${schema.type}` }];
  }

  if (issues.length > 0) return Err(issues);
  return Ok(value);
}

export function validateObject<T extends Record<string, unknown>>(
  value: unknown,
  schema: JsonSchema & { type: 'object' },
): Result<T, readonly ValidationIssue[]> {
  const result = validate(value, schema);
  if (!result.ok) return result;
  return Ok(result.value as T);
}
