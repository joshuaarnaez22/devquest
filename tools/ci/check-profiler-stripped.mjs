/**
 * After `vite build`, the DEV-only profiler body must be absent.
 * Sentinel lives only inside `Profiler.wrapDev` behind `import.meta.env.DEV`
 * (docs/15-Performance.md §13.1).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SENTINEL = 'DQ_PROFILER_DEV_ONLY';
const dist = join(process.cwd(), 'dist');

function walkJs(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkJs(p, out);
    else if (name.endsWith('.js')) out.push(p);
  }
  return out;
}

try {
  const files = walkJs(dist);
  if (files.length === 0) {
    console.error('ci:profiler — no dist/*.js; run npm run build first');
    process.exit(1);
  }
  const hits = [];
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    if (src.includes(SENTINEL)) hits.push(file);
  }
  if (hits.length > 0) {
    console.error('ci:profiler — DEV profiler leaked into production bundle:');
    for (const h of hits) console.error(`  ${h}`);
    process.exit(1);
  }
  console.log(`ci:profiler — ok (${files.length} js files, sentinel absent)`);
} catch (err) {
  console.error('ci:profiler —', err instanceof Error ? err.message : err);
  process.exit(1);
}
