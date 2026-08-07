/**
 * build-atlas.ts — deterministic atlas skeleton (M0). Empty input → empty hash file.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const inputDir = resolve(root, 'art/source');
const outDir = resolve(root, 'public/assets/atlas');
const hashFile = resolve(root, 'tools/atlas/atlas-hashes.json');

mkdirSync(outDir, { recursive: true });
mkdirSync(inputDir, { recursive: true });

const collator = new Intl.Collator('en', { numeric: true });

function listPngs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) out.push(...listPngs(p));
    else if (name.name.endsWith('.png')) out.push(p);
  }
  return out.sort((a, b) => collator.compare(a, b));
}

const inputs = listPngs(inputDir);
const hash = createHash('sha256');
for (const f of inputs) hash.update(readFileSync(f));
hash.update(`count:${inputs.length}`);
const digest = hash.digest('hex');

const manifest = {
  generatedAt: 'deterministic',
  inputCount: inputs.length,
  inputs: inputs.map(f => f.replace(root + '/', '')),
  sha256: digest,
};

writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
writeFileSync(
  hashFile,
  JSON.stringify({ sha256: digest, inputCount: inputs.length }, null, 2) + '\n',
);

console.log(`build-atlas: ${inputs.length} inputs, sha256=${digest.slice(0, 12)}…`);
