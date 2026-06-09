import { buildConfig } from 'eslint-config-spartan';
import {
  jsDoc,
  mdx,
  nextJs,
  prettier,
  react,
  testingLibraryReact,
  typeEnabled,
  vitest,
} from 'eslint-config-spartan/mixins';

export default buildConfig(
  typeEnabled({
    parserOptions: {
      tsconfigRootDir: import.meta.dirname,
      projectService: true,
    },
  }),
  nextJs,
  react,
  vitest,
  jsDoc,
  mdx,
  testingLibraryReact,
  prettier,
  {
    files: ['components/ui/**/*.tsx'],
    rules: {
      '@typescript-eslint/no-magic-numbers': 'off',
    },
  },
  {
    ignores: [
      '.next/',
      'out/',
      'node_modules/',
      'coverage/',
      'reports/',
      'specs/',
      'next-env.d.ts',
      'public/sw.js',
      'public/sw.js.map',
      'public/swe-worker-*.js',
    ],
  },
);
