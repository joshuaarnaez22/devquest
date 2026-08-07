import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const code = readFileSync(join(root, 'src/config/Palette.ts'), 'utf8');
const keys = [...code.matchAll(/\b([NWGCM]S?\d)\s*:/g)].map(m => m[1]);
// Count Palette keys N0-S5 style
const count = (code.match(/^\s+[A-Z]\d:\s/gm) || []).length;
if (count < 40) {
  console.error(`check-palette: expected ~48 colours, got ${count}`);
  process.exit(1);
}
console.log(`check-palette: ok (${count} colours)`);
void keys;
