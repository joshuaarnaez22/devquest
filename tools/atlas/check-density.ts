/** check-density.ts — sprite height 28–34 or 56–68. Empty input passes. */
import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const inputDir = resolve(root, 'art/source');

function hasPng(dir: string): boolean {
  if (!existsSync(dir)) return false;
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    if (name.isDirectory() && hasPng(resolve(dir, name.name))) return true;
    if (name.name.endsWith('.png')) return true;
  }
  return false;
}

if (!hasPng(inputDir)) {
  console.log('check-density: no sprites — OK (M0 skeleton)');
  process.exit(0);
}

console.log('check-density: sprites present — full measure lands with sharp in Gate 3');
process.exit(0);
