import { Err, Ok } from '@core/Result';
import { validateObject } from '@core/SchemaValidator';
import { CHARACTER_IDS } from '@data/CharacterTypes';
import knightJson from '../../public/assets/data/characters/knight.json';
import ninjaJson from '../../public/assets/data/characters/ninja.json';
import samuraiJson from '../../public/assets/data/characters/samurai.json';
import wizardJson from '../../public/assets/data/characters/wizard.json';
import type { Result } from '@core/Result';
import type { ValidationIssue } from '@core/SchemaValidator';
import type { CharacterContent, CharacterId, CharacterMovementData } from '@data/CharacterTypes';

const MOVEMENT_SCHEMA = {
  type: 'object',
  required: [
    'runSpeed',
    'groundAccel',
    'groundDecel',
    'airAccel',
    'airDecel',
    'jumpVelocity',
    'airJumps',
    'airJumpScale',
    'dashSpeed',
    'dashDurationMs',
    'dashCooldownMs',
    'dashIFrames',
    'dashIFrameGraceMs',
    'wallSlideSpeed',
  ],
  properties: {
    runSpeed: { type: 'number' },
    groundAccel: { type: 'number' },
    groundDecel: { type: 'number' },
    airAccel: { type: 'number' },
    airDecel: { type: 'number' },
    jumpVelocity: { type: 'number' },
    airJumps: { type: 'integer' },
    airJumpScale: { type: 'number' },
    dashSpeed: { type: 'number' },
    dashDurationMs: { type: 'integer' },
    dashCooldownMs: { type: 'integer' },
    dashIFrames: { type: 'boolean' },
    dashIFrameGraceMs: { type: 'integer' },
    wallSlideSpeed: { type: 'number' },
  },
} as const;

const CHARACTER_SCHEMA = {
  type: 'object',
  required: ['id', 'displayName', 'animPrefix', 'movement'],
  properties: {
    id: { type: 'string' },
    displayName: { type: 'string' },
    animPrefix: { type: 'string' },
    movement: MOVEMENT_SCHEMA,
  },
} as const;

const RAW_BY_ID: Readonly<Record<CharacterId, unknown>> = {
  knight: knightJson,
  samurai: samuraiJson,
  ninja: ninjaJson,
  wizard: wizardJson,
};

function parseCharacter(
  id: CharacterId,
  raw: unknown,
): Result<CharacterContent, readonly ValidationIssue[]> {
  const result = validateObject<Record<string, unknown>>(raw, CHARACTER_SCHEMA);
  if (!result.ok) return result;

  const value = result.value;
  if (value['id'] !== id) {
    return Err([{ path: '/id', message: `expected "${id}"` }]);
  }

  const movement = value['movement'] as CharacterMovementData;
  return Ok({
    id,
    displayName: value['displayName'] as string,
    animPrefix: value['animPrefix'] as string,
    movement: Object.freeze({ ...movement }),
  });
}

/**
 * Minimal content DB for M1 — four hero movement blocks (docs/06 §5.2).
 * Full ContentDatabase lands in M4.
 */
export class ContentDatabase {
  private readonly characters: ReadonlyMap<CharacterId, CharacterContent>;

  private constructor(characters: ReadonlyMap<CharacterId, CharacterContent>) {
    this.characters = characters;
  }

  static create(): Result<ContentDatabase, readonly ValidationIssue[]> {
    const map = new Map<CharacterId, CharacterContent>();
    const issues: ValidationIssue[] = [];

    for (const id of CHARACTER_IDS) {
      const parsed = parseCharacter(id, RAW_BY_ID[id]);
      if (!parsed.ok) {
        for (const issue of parsed.error) {
          issues.push({ path: `/characters/${id}${issue.path}`, message: issue.message });
        }
        continue;
      }
      map.set(id, Object.freeze(parsed.value));
    }

    if (issues.length > 0) return Err(issues);
    return Ok(new ContentDatabase(map));
  }

  character(id: CharacterId): CharacterContent {
    const found = this.characters.get(id);
    if (found === undefined) {
      throw new Error(`unknown character: ${id}`);
    }
    return found;
  }

  validateAll(): Result<void, readonly ValidationIssue[]> {
    // Construction already validated; re-check map completeness.
    for (const id of CHARACTER_IDS) {
      if (!this.characters.has(id)) {
        return Err([{ path: `/characters/${id}`, message: 'missing' }]);
      }
    }
    return Ok(undefined);
  }
}
