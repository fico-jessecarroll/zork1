/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      displayName: 'engine',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: [
        '**/engine/**/*.spec.ts',
        '**/engine/**/*.test.ts',
        '**/test/**/*.spec.ts',
      ],
      globals: {
        'ts-jest': {
          tsconfig: './tsconfig.json',
        },
      },
    },
    {
      displayName: 'app',
      preset: 'jest-preset-angular',
      testEnvironment: 'jsdom',
      testMatch: ['**/app/**/*.spec.ts'],
      setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
      globals: {
        'ts-jest': {
          tsconfig: './tsconfig.spec.json',
          stringifyContentPathRegex: '\\.html$',
        },
      },
    },
  ],
};
