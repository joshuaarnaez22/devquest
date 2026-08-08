#!/usr/bin/env node
/**
 * Diff character movement JSON against docs/06-Characters.md §5.2.
 * Usage: node tools/ci/check-character-values.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const dir = join(root, 'public/assets/data/characters');

/** Normative movement values from docs/06 §5.2 (JSON field names). */
const EXPECTED = {
  knight: {
    runSpeed: 78,
    groundAccel: 700,
    groundDecel: 900,
    airAccel: 420,
    airDecel: 280,
    jumpVelocity: -230,
    airJumps: 0,
    dashSpeed: 210,
    dashDurationMs: 140,
    dashCooldownMs: 700,
    dashIFrames: false,
    wallSlideSpeed: 90,
  },
  samurai: {
    runSpeed: 90,
    groundAccel: 900,
    groundDecel: 1200,
    airAccel: 600,
    airDecel: 400,
    jumpVelocity: -240,
    airJumps: 0,
    dashSpeed: 260,
    dashDurationMs: 150,
    dashCooldownMs: 500,
    dashIFrames: false,
    wallSlideSpeed: 70,
  },
  ninja: {
    runSpeed: 108,
    groundAccel: 1150,
    groundDecel: 1400,
    airAccel: 780,
    airDecel: 520,
    jumpVelocity: -225,
    airJumps: 1,
    dashSpeed: 310,
    dashDurationMs: 170,
    dashCooldownMs: 380,
    dashIFrames: true,
    wallSlideSpeed: 45,
  },
  wizard: {
    runSpeed: 82,
    groundAccel: 820,
    groundDecel: 1100,
    airAccel: 560,
    airDecel: 380,
    jumpVelocity: -232,
    airJumps: 0,
    dashSpeed: 240,
    dashDurationMs: 150,
    dashCooldownMs: 600,
    dashIFrames: false,
    wallSlideSpeed: 80,
  },
};

const DERIVED = {
  knight: { jumpHeight: 29.4, dashDistance: 29.4 },
  samurai: { jumpHeight: 32.0, dashDistance: 39.0 },
  ninja: { jumpHeight: 28.1, dashDistance: 52.7 },
  wizard: { jumpHeight: 29.9, dashDistance: 36.0 },
};

const GRAVITY_Y = 900;
const TOL = 0.15;

const failures = [];

for (const [id, expected] of Object.entries(EXPECTED)) {
  const path = join(dir, `${id}.json`);
  let raw;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    failures.push(`${id}: cannot read ${path}: ${e}`);
    continue;
  }

  if (raw.id !== id) {
    failures.push(`${id}: id is ${JSON.stringify(raw.id)}`);
  }

  const m = raw.movement ?? {};
  for (const [key, want] of Object.entries(expected)) {
    if (m[key] !== want) {
      failures.push(`${id}.movement.${key}: got ${JSON.stringify(m[key])}, want ${want}`);
    }
  }

  const jumpH = (m.jumpVelocity * m.jumpVelocity) / (2 * GRAVITY_Y);
  const dashD = m.dashSpeed * (m.dashDurationMs / 1000);
  const d = DERIVED[id];
  if (Math.abs(jumpH - d.jumpHeight) > TOL) {
    failures.push(`${id} jumpHeight derived ${jumpH.toFixed(2)} vs table ${d.jumpHeight}`);
  }
  if (Math.abs(dashD - d.dashDistance) > TOL) {
    failures.push(`${id} dashDistance derived ${dashD.toFixed(2)} vs table ${d.dashDistance}`);
  }
}

if (failures.length) {
  console.error('check-character-values FAILED:\n' + failures.join('\n'));
  process.exit(1);
}
console.log('check-character-values: OK (4 heroes × §5.2)');
