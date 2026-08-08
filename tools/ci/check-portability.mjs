import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const src = join(root, 'src');

/** @param {string} dir @returns {string[]} */
function listTsFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      out.push(...listTsFiles(path));
      continue;
    }
    if (!name.endsWith('.ts') || name.endsWith('.test.ts')) continue;
    out.push(path);
  }
  return out;
}

// Match real API usage, not prose like "timestamp window"
const globalRe =
  /(window\.|document\.|localStorage\.|navigator\.|\bfetch\s*\(|\bsetTimeout\s*\(|\bsetInterval\s*\()/;
const mathRandomRe = /Math\.random\s*\(/;

const violations = [];

for (const file of listTsFiles(src)) {
  const rel = relative(root, file).replaceAll('\\', '/');
  const lines = readFileSync(file, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (globalRe.test(line) && !rel.includes('/platform/')) {
      violations.push(`${rel}:${i + 1}:${line}`);
    }
    if (mathRandomRe.test(line) && !rel.endsWith('/core/Rng.ts')) {
      violations.push(`${rel}:${i + 1}:${line}`);
    }
  }
}

if (violations.length) {
  console.error('check-portability FAILED:\n' + violations.join('\n'));
  process.exit(1);
}
console.log('check-portability: OK');
