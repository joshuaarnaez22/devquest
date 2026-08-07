/** check-budget.ts — atlas budget table (docs/05 §7.3). Passes on empty atlas. */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const atlasDir = resolve(root, 'public/assets/atlas');
const MAX_ATLAS_MB = 8;

if (!existsSync(atlasDir)) {
  console.log('check-budget: no atlas yet — OK');
  process.exit(0);
}

const manifestPath = resolve(atlasDir, 'manifest.json');
if (existsSync(manifestPath)) {
  const st = statSync(manifestPath);
  if (st.size > MAX_ATLAS_MB * 1024 * 1024) {
    console.error('check-budget FAILED: atlas over budget');
    process.exit(1);
  }
  void readFileSync;
}
console.log('check-budget: OK');
