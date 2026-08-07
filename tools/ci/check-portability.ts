/**
 * check-portability — second net under lint (M0-T11).
 * Browser globals outside src/platform/; Math.random outside src/core/Rng.ts.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const srcRoot = join(root, 'src');

// Require identifier usage, not prose ("timestamp window").
const GLOBALS =
  /(?<![.\w])(window|document|localStorage|navigator|fetch|setTimeout|setInterval)\s*(\.|\[|\(|;|,|\)|$)/g;
const MATH_RANDOM = /Math\.random\s*\(/g;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.ts') && !p.endsWith('.test.ts')) out.push(p);
  }
  return out;
}

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

let failed = 0;
for (const file of walk(srcRoot)) {
  const rel = relative(root, file).replace(/\\/g, '/');
  const text = stripComments(readFileSync(file, 'utf8'));
  const inPlatform = rel.startsWith('src/platform/');
  const isRng = rel === 'src/core/Rng.ts';

  if (!inPlatform) {
    for (const m of text.matchAll(GLOBALS)) {
      const line = text.slice(0, m.index).split('\n').length;
      console.error(`${rel}:${line}: forbidden global '${m[1]}' outside platform/`);
      failed += 1;
    }
  }
  if (!isRng) {
    for (const m of text.matchAll(MATH_RANDOM)) {
      const line = text.slice(0, m.index).split('\n').length;
      console.error(`${rel}:${line}: Math.random outside Rng.ts`);
      failed += 1;
    }
  }
}

if (failed > 0) {
  console.error(`check-portability FAILED (${failed})`);
  process.exit(1);
}
console.log('check-portability: ok');
