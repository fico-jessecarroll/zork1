// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],

      // Pure-style rules that conflict with the codebase's deliberate ZIL
      // port conventions (union/object `type` aliases, `ReadonlyArray<T>`).
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/consistent-generic-constructors': 'off',

      // `command` output predates the browser Invoker Commands API's native
      // `command` event and is a domain term, not a DOM event re-emit.
      '@angular-eslint/no-output-native': 'off',

      // Underscore-prefixed params (`_prso`/`_prsi`) are required by the
      // PERFORM handler signature but intentionally unused. Genuine dead
      // code is surfaced as a warning rather than blocking the gate.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // Only flag when the entire destructuring can be const (several sites
      // destructure a reassigned RNG-seed alongside a single-use value).
      'prefer-const': ['error', { destructuring: 'all' }],
    },
  },
  {
    // Test specs and transcript runners legitimately use `any` for mocks and
    // exercise edge cases; keep them lintable without enforcing app-grade rules.
    files: ['**/*.spec.ts', '**/test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      'no-duplicate-case': 'warn',
      'prefer-const': 'warn',
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {
      // Template uses *ngIf/*ngFor structural directives throughout; migrating
      // to built-in @if/@for control flow is a separate modernization effort.
      '@angular-eslint/template/prefer-control-flow': 'off',
    },
  },
]);
