import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const root = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(root, 'src');

export default defineConfig({
  base: './',
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
  assetsInclude: ['**/*.tmj'],
  build: {
    target: 'es2022',
  },
  server: {
    port: 5173,
  },
});
