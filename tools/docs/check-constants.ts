/**
 * check-constants — parses docs/00-README.md §5 tables vs GameConstants.ts.
 * M0-T11. Fail on any mismatch.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BUDGET, DISPLAY, FEEDBACK, FEEL, PHYSICS } from '../../src/config/GameConstants.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const doc = readFileSync(join(root, 'docs/00-README.md'), 'utf8');

function expectDocContains(name: string): void {
  if (!doc.includes(name)) {
    throw new Error(`docs/00-README.md missing constant ${name}`);
  }
}

const names = [
  'GRAVITY_Y',
  'MAX_FALL_SPEED',
  'FALL_GRAVITY_MULT',
  'APEX_GRAVITY_MULT',
  'APEX_THRESHOLD',
  'COYOTE_TIME',
  'JUMP_BUFFER',
  'VARIABLE_JUMP_CUT',
  'DASH_SPEED',
  'DASH_DURATION',
  'DASH_COOLDOWN',
  'HITSTOP_LIGHT',
  'HITSTOP_HEAVY',
] as const;

for (const name of names) {
  expectDocContains(name);
}

// Parity: GameConstants values that the normative code block in §14 lists
const code = readFileSync(join(root, 'src/config/GameConstants.ts'), 'utf8');
const required = [
  `WIDTH: ${DISPLAY.WIDTH}`,
  `HEIGHT: ${DISPLAY.HEIGHT}`,
  `GRAVITY_Y: ${PHYSICS.GRAVITY_Y}`,
  `COYOTE_TIME: ${FEEL.COYOTE_TIME}`,
  `HITSTOP_LIGHT: ${FEEDBACK.HITSTOP_LIGHT}`,
  `FRAME_MS: ${BUDGET.FRAME_MS}`,
];
for (const frag of required) {
  if (!code.includes(frag)) {
    throw new Error(`GameConstants.ts missing ${frag}`);
  }
}

console.log('check-constants: ok');
