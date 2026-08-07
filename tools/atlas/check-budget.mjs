import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const manifestPath = join(root, 'public/assets/atlas/manifest.json');
if (!existsSync(manifestPath)) {
  console.log('check-budget: no atlas yet — ok');
  process.exit(0);
}
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
if ((manifest.inputCount ?? 0) > 32) {
  console.error('check-budget: too many inputs');
  process.exit(1);
}
console.log('check-budget: OK');
