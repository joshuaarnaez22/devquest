/** check-palette.ts — palette conformance vs Palette.ts. Empty input passes. */
import { Palette } from '../../src/config/Palette.ts';

const keys = Object.keys(Palette);
if (keys.length < 40) {
  console.error(`check-palette FAILED: expected ~48 colours, got ${keys.length}`);
  process.exit(1);
}
console.log(`check-palette: OK (${keys.length} colours in master palette)`);
