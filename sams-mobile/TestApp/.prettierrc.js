/**
 * 💅 Prettier Configuration
 * Code formatting configuration for consistent code style
 */

module.exports = {
  // Basic formatting
  semi: true,
  singleQuote: true,
  quoteProps: 'as-needed',
  trailingComma: 'es5',
  tabWidth: 2,
  useTabs: false,
  printWidth: 100,
  endOfLine: 'lf',

  // JSX formatting
  jsxSingleQuote: true,
  jsxBracketSameLine: false,

  // Object formatting
  bracketSpacing: true,
  bracketSameLine: false,

  // Arrow function formatting
  arrowParens: 'avoid',

  // HTML formatting
  htmlWhitespaceSensitivity: 'css',

  // Vue formatting
  vueIndentScriptAndStyle: false,

  // Embedded language formatting
  embeddedLanguageFormatting: 'auto',

  // File-specific overrides
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 80,
        tabWidth: 2,
      },
    },
    {
      files: '*.md',
      options: {
        printWidth: 80,
        proseWrap: 'always',
        tabWidth: 2,
      },
    },
    {
      files: '*.yml',
      options: {
        tabWidth: 2,
        singleQuote: false,
      },
    },
    {
      files: '*.yaml',
      options: {
        tabWidth: 2,
        singleQuote: false,
      },
    },
    {
      files: ['*.ts', '*.tsx'],
      options: {
        parser: 'typescript',
        printWidth: 100,
        tabWidth: 2,
        semi: true,
        singleQuote: true,
        trailingComma: 'es5',
      },
    },
    {
      files: ['*.js', '*.jsx'],
      options: {
        parser: 'babel',
        printWidth: 100,
        tabWidth: 2,
        semi: true,
        singleQuote: true,
        trailingComma: 'es5',
      },
    },
  ],
};
