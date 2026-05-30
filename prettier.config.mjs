/**
 * @see https://prettier.io/docs/configuration
 * @type {import("prettier").Config}
 */
const config = {
  arrowParens: 'always',
  bracketSameLine: false,
  bracketSpacing: true,
  endOfLine: 'lf',
  jsxSingleQuote: false,
  plugins: ['prettier-plugin-tailwindcss'],
  printWidth: 120,
  proseWrap: 'always',
  quoteProps: 'as-needed',
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  tailwindFunctions: ['cva', 'cn'],
  trailingComma: 'all',
  useTabs: false,
  overrides: [
    {
      files: '*.{yaml,yml}',
      options: {
        singleQuote: false,
      },
    },
  ],
};

export default config;
