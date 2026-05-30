import { buildConfig } from 'eslint-config-spartan';
import { nextJs, prettier, react, testingLibraryReact, typeEnabled, vitest } from 'eslint-config-spartan/mixins';

export default buildConfig(
  typeEnabled({
    files: ['**/*.ts', '**/*.tsx'],
    parserOptions: {
      tsconfigRootDir: import.meta.dirname,
      projectService: true,
    },
  }),
  nextJs(),
  react(),
  vitest(),
  testingLibraryReact(),
  prettier(),
  {
    files: ['components/ui/**/*.tsx'],
    rules: {
      '@typescript-eslint/no-magic-numbers': 'off',
    },
  },
  {
    ignores: ['.next/', 'node_modules/', 'coverage/', 'next-env.d.ts'],
  },
);
