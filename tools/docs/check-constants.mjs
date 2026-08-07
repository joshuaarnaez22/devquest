import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const doc = readFileSync(join(root, 'docs/00-README.md'), 'utf8');
const code = readFileSync(join(root, 'src/config/GameConstants.ts'), 'utf8');

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
];

for (const name of names) {
  if (!doc.includes(name)) throw new Error(`docs missing ${name}`);
}

const required = [
  'WIDTH: 320',
  'HEIGHT: 180',
  'GRAVITY_Y: 900',
  'COYOTE_TIME: 100',
  'HITSTOP_LIGHT: 60',
  'FRAME_MS: 16.67',
];
for (const frag of required) {
  if (!code.includes(frag)) throw new Error(`GameConstants.ts missing ${frag}`);
}

console.log('check-constants: ok');
