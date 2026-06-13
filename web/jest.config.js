/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    '**/engine/**/*.spec.ts',
    '**/engine/**/*.test.ts',
    '**/test/**/*.spec.ts',
  ],
  globals: {
    'ts-jest': {
      tsconfig: './tsconfig.jest.json',
    },
  },
};
