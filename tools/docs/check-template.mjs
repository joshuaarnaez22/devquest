import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUIRED = [
  'Purpose',
  'Goals',
  'Design Principles',
  'Overview',
  'Technical Design',
  'Implementation Notes',
  'Architecture',
  'Examples',
  'Data Structures',
  'Future Expansion',
  'Acceptance Criteria',
  'Out of Scope',
  'Cross References',
];

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const docsDir = join(root, 'docs');
const files = readdirSync(docsDir)
  .filter(f => /^\d{2}-.+\.md$/.test(f) && f !== '00-README.md')
  .sort();

let failed = false;
for (const file of files) {
  const n = Number(file.slice(0, 2));
  if (n < 1 || n > 20) continue;
  const text = readFileSync(join(docsDir, file), 'utf8');
  const missing = [];
  for (const heading of REQUIRED) {
    const re = new RegExp(
      `^##\\s+(\\d+\\.\\s*)?${heading.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}(\\s|$|[—\\-:])`,
      'm',
    );
    if (!re.test(text)) missing.push(heading);
  }
  if (missing.length) {
    failed = true;
    console.error(`${file} missing: ${missing.join(', ')}`);
  }
}

if (failed) {
  console.error('check-template FAILED');
  process.exit(1);
}
console.log(`check-template: OK (${files.length} docs)`);
