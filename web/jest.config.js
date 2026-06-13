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
  collectCoverage: true,
  collectCoverageFrom: [
    'src/engine/**/*.ts',
    '!src/engine/**/*.spec.ts',
    '!src/engine/**/*.test.ts',
  ],
  coverageReporters: ['text-summary', 'lcov'],
  // Ratchet: thresholds sit just below current measured coverage so the suite
  // cannot regress. combat.ts and persistence.ts hold the critical
  // combat/save-restore logic and are locked at 100%.
  coverageThreshold: {
    global: {
      statements: 87,
      branches: 77,
      functions: 88,
      lines: 89,
    },
    './src/engine/combat.ts': {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
    './src/engine/persistence.ts': {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
  },
};
