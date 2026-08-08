import js from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'public/assets/atlas/**',
      'eslint.config.js',
      'commitlint.config.cjs',
      '**/*.mjs',
      'e2e/**',
      'test/shims/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      boundaries,
      import: importPlugin,
    },
    settings: {
      'boundaries/elements': [
        { type: 'config', pattern: 'src/config/*' },
        { type: 'platform', pattern: 'src/platform/**/*' },
        { type: 'core', pattern: 'src/core/*' },
        { type: 'systems', pattern: 'src/systems/**/*' },
        { type: 'components', pattern: 'src/components/*' },
        { type: 'entities', pattern: 'src/entities/**/*' },
        { type: 'level', pattern: 'src/level/**/*' },
        { type: 'ui', pattern: 'src/ui/**/*' },
        { type: 'scenes', pattern: 'src/scenes/*' },
        { type: 'portfolio', pattern: 'src/portfolio/**/*' },
      ],
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      complexity: ['error', 12],
      'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }],
      'max-params': ['error', 4],
      'max-depth': ['error', 4],
      'import/no-default-export': 'error',
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'type'],
          pathGroups: [
            { pattern: '@config/**', group: 'internal', position: 'before' },
            { pattern: '@core/**', group: 'internal', position: 'before' },
            { pattern: '@components/**', group: 'internal', position: 'before' },
          ],
          pathGroupsExcludedImportTypes: ['type'],
          'newlines-between': 'never',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],

      // Layer boundaries (03-Technical-Architecture §6.1)
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: 'config', allow: ['config'] },
            { from: 'platform', allow: ['config', 'platform'] },
            { from: 'core', allow: ['config', 'platform', 'core'] },
            { from: 'systems', allow: ['config', 'platform', 'core', 'components'] },
            { from: 'components', allow: ['config', 'core', 'components'] },
            { from: 'entities', allow: ['config', 'core', 'components', 'entities'] },
            { from: 'level', allow: ['config', 'core', 'components', 'entities', 'systems'] },
            { from: 'ui', allow: ['config', 'platform', 'core', 'systems', 'ui'] },
            {
              from: 'portfolio',
              allow: ['config', 'platform', 'core', 'systems', 'ui', 'portfolio'],
            },
            { from: 'scenes', allow: ['*'] },
          ],
        },
      ],

      // Steam portability (03 §14.2)
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'Use src/platform/. Breaks the Steam port. (docs/03 §14.2)' },
        { name: 'document', message: 'Use src/platform/. (docs/03 §14.2)' },
        { name: 'localStorage', message: 'Use platform/Storage.ts. (docs/03 §14.2)' },
        { name: 'navigator', message: 'Use platform/Env.ts. (docs/03 §14.2)' },
        { name: 'fetch', message: 'The game is offline. No network calls. (docs/01)' },
        { name: 'setTimeout', message: 'Use scene.time.delayedCall (pooled, pausable). (docs/16)' },
        { name: 'setInterval', message: 'Use scene.time.addEvent. (docs/16)' },
        { name: 'alert', message: 'Native dialogs look wrong in a game. (docs/13)' },
        { name: 'confirm', message: 'Use a UI confirmation panel. (docs/13)' },
      ],

      // Determinism + BitmapText (ADR-019, ADR-008, 04 §9.2)
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Use Registry.get("rng"). Determinism enables replays. (ADR-019)',
        },
        {
          object: 'this.add',
          property: 'text',
          message: 'Use BitmapText. See 04-Art-Direction §9.2. (ADR-008)',
        },
      ],

      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='setDepth'] > Literal",
          message: 'Use a constant from src/config/Depth.ts. (04-Art-Direction §10.1)',
        },
        {
          selector: 'TSEnumDeclaration',
          message: 'Use `as const` objects. Enums emit runtime code. (docs/16 §5.6)',
        },
        {
          selector: "MemberExpression[property.name='unlocksSection']",
          message:
            'unlocksSection may only be read in src/portfolio/. See the Deletion Test. (docs/12 §5.3)',
        },
      ],
    },
  },
  {
    files: ['src/platform/**/*.ts'],
    rules: { 'no-restricted-globals': 'off' },
  },
  {
    files: ['src/core/Rng.ts'],
    rules: { 'no-restricted-properties': 'off' },
  },
  {
    files: ['src/portfolio/**/*.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    files: ['src/config/Depth.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    files: ['src/entities/**/*Animator.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[property.name='body']",
          message: 'Animators are read-only projections of state. See Pillar 1. (02 §5.1.5)',
        },
      ],
    },
  },
  // Config files may default-export (Vite/ESLint/Vitest/Playwright conventions)
  {
    files: [
      'vite.config.ts',
      'vitest.config.ts',
      'playwright.config.ts',
      'eslint.config.js',
      '**/eslint.config.*',
    ],
    rules: { 'import/no-default-export': 'off' },
  },
  {
    files: ['tools/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
    rules: {
      'no-restricted-globals': 'off',
      'no-console': 'off',
      'import/no-default-export': 'off',
      'max-lines': 'off',
    },
  },
);
