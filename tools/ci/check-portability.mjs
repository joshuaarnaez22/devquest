import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const src = join(root, 'src');

function rg(pattern) {
  try {
    return execSync(`rg -n --glob '*.ts' --glob '!**/*.test.ts' '${pattern}' '${src}'`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (e) {
    if (e.status === 1) return '';
    throw e;
  }
}

const violations = [];

// Match real API usage, not prose like "timestamp window"
const globalPattern =
  '(window\\.|document\\.|localStorage\\.|navigator\\.|\\bfetch\\s*\\(|\\bsetTimeout\\s*\\(|\\bsetInterval\\s*\\()';
for (const line of rg(globalPattern).split('\n').filter(Boolean)) {
  if (line.includes('/platform/')) continue;
  violations.push(line);
}

for (const line of rg('Math\\.random\\s*\\(').split('\n').filter(Boolean)) {
  if (line.includes('/core/Rng.ts')) continue;
  violations.push(line);
}

if (violations.length) {
  console.error('check-portability FAILED:\n' + violations.join('\n'));
  process.exit(1);
}
console.log('check-portability: OK');
