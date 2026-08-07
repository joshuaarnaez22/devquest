import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const dist = join(root, 'dist');

if (!existsSync(dist)) {
  console.error('check-size: dist/ missing — run build first');
  process.exit(1);
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

let payload = 0;
let jsGz = 0;
for (const f of walk(dist)) {
  const buf = readFileSync(f);
  payload += buf.length;
  if (f.endsWith('.js')) jsGz += gzipSync(buf).length;
}

const maxGz = 1.2 * 1024 * 1024;
const maxPayload = 8 * 1024 * 1024;
console.log(
  `check-size: js.gz=${(jsGz / 1024).toFixed(1)} KiB payload=${(payload / 1024).toFixed(1)} KiB`,
);
if (jsGz > maxGz || payload > maxPayload) {
  console.error('check-size FAILED');
  process.exit(1);
}
console.log('check-size: OK');
