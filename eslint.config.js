const eslintConfigPrettier = require('eslint-config-prettier');

module.exports = [
  {
    files: ['**/*.js'],
    ignores: ['public/**', 'scripts/**', 'test_gemini.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        __dirname: 'readonly',
        process: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['off'],
      'no-console': 'off',
      'prefer-const': 'warn',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      'no-multiple-empty-lines': 'error',
      semi: ['error', 'always'],
      quotes: ['error', 'single', { avoidEscape: true }],
    },
  },
  eslintConfigPrettier,
];
