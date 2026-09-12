import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['out/**', '.vite/**', 'dist/**', 'design/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      // projectService (not `project`) so config files outside tsconfig's `include`
      // — eslint.config.js itself, vitest.config.ts — lint without a
      // "file not found in project" error. eslint.config.js still isn't matched by
      // any tsconfig `include` pattern (it's .js; tsconfig only globs *.config.ts),
      // so it needs an explicit allowDefaultProject entry, or the project service
      // throws "was not found by the project service" on itself.
      parserOptions: {
        projectService: { allowDefaultProject: ['eslint.config.js'] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // CLAUDE.md: never hide problems behind escape hatches.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  prettier,
);
