import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const scenesDir = join(root, 'src/scenes');

if (!existsSync(scenesDir)) {
  console.log('check-scenes: no scenes dir');
  process.exit(0);
}

const files = readdirSync(scenesDir).filter(f => f.endsWith('.ts'));
let failed = false;

for (const file of files) {
  const text = readFileSync(join(scenesDir, file), 'utf8');
  if (!/extends\s+Phaser\.Scene/.test(text)) continue;
  const hasWire =
    /Scenes\.Events\.SHUTDOWN[\s\S]*shutdown/.test(text) ||
    /events\.once\([^)]*SHUTDOWN[^)]*shutdown/.test(text);
  const hasMethod = /shutdown\s*\(/.test(text);
  if (!hasWire || !hasMethod) {
    failed = true;
    console.error(`${file}: missing shutdown contract (wire=${hasWire}, method=${hasMethod})`);
  }
}

if (failed) {
  console.error('check-scenes FAILED');
  process.exit(1);
}
console.log(`check-scenes: OK (${files.length} files)`);
