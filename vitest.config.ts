import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(root, 'src');

export default defineConfig({
  resolve: {
    alias: {
      '@config': path.join(src, 'config'),
      '@platform': path.join(src, 'platform'),
      '@core': path.join(src, 'core'),
      '@systems': path.join(src, 'systems'),
      '@components': path.join(src, 'components'),
      '@entities': path.join(src, 'entities'),
      '@level': path.join(src, 'level'),
      '@ui': path.join(src, 'ui'),
      '@scenes': path.join(src, 'scenes'),
      '@data': path.join(src, 'data'),
      '@util': path.join(src, 'util'),
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'tools/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/core/**/*.ts', 'src/systems/**/*.ts'],
      exclude: ['**/*.test.ts', '**/index.ts'],
      thresholds: {
        'src/core/**/*.ts': {
          lines: 70,
          functions: 70,
          branches: 70,
          statements: 70,
        },
      },
    },
  },
});
