/**
 * E2E Jest Configuration for Detox
 * Comprehensive mobile testing configuration for SAMS
 */

module.exports = {
  rootDir: '..',
  testMatch: [
    '<rootDir>/e2e/**/*.e2e.{js,ts}',
    '<rootDir>/e2e/**/*.test.{js,ts}',
  ],
  testTimeout: 120000,
  maxWorkers: 1,
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',

  // Enhanced reporting configuration
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'e2e/reports',
      outputName: 'e2e-results.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true,
    }],
    ['jest-html-reporters', {
      publicPath: 'e2e/reports',
      filename: 'detox-report.html',
      expand: true,
      hideIcon: false,
      pageTitle: 'SAMS Mobile E2E Test Report',
      includeFailureMsg: true,
      includeSuiteFailure: true,
    }],
  ],

  testEnvironment: 'detox/runners/jest/testEnvironment',
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/e2e/setup.js'],

  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },

  // Module configuration
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@screens/(.*)$': '<rootDir>/src/screens/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@assets/(.*)$': '<rootDir>/src/assets/$1',
  },

  // Test path configuration
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/android/',
    '<rootDir>/ios/',
    '<rootDir>/__tests__/',
    '<rootDir>/src/',
  ],

  // Coverage configuration (disabled for E2E tests)
  collectCoverage: false,
  collectCoverageFrom: [
    'e2e/**/*.{js,jsx,ts,tsx}',
    '!e2e/setup.{js,ts}',
    '!e2e/jest.config.js',
    '!e2e/artifacts/**',
    '!e2e/reports/**',
  ],
  coverageDirectory: 'e2e/coverage',
  coverageReporters: ['text', 'lcov', 'html'],

  // Error handling
  bail: false,
  errorOnDeprecated: true,

  // Performance
  detectOpenHandles: true,
  forceExit: true,

  // Watch configuration
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/android/',
    '<rootDir>/ios/',
    '<rootDir>/e2e/artifacts/',
    '<rootDir>/e2e/reports/',
  ],

  // Global variables
  globals: {
    __DEV__: true,
    __TEST__: true,
    device: 'global',
  },
};
