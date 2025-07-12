module.exports = {
  preset: 'react-native',
  setupFiles: [
    '<rootDir>/__tests__/setup.js',
  ],
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setupAfterEnv.js',
    '@testing-library/jest-native/extend-expect',
  ],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.(test|spec).{js,jsx,ts,tsx}',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/android/',
    '<rootDir>/ios/',
    '<rootDir>/e2e/',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/test/**',
    '!src/**/__tests__/**',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/**/*.spec.{js,jsx,ts,tsx}',
    '!src/**/index.{js,jsx,ts,tsx}',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/components/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    './src/services/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './src/store/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@screens/(.*)$': '<rootDir>/src/screens/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@navigation/(.*)$': '<rootDir>/src/navigation/$1',
    '^@assets/(.*)$': '<rootDir>/assets/$1',
    '^@api/(.*)$': '<rootDir>/api/$1',
    '^@context/(.*)$': '<rootDir>/context/$1',
    '^@store/(.*)$': '<rootDir>/src/store/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-vector-icons|react-native-gesture-handler|react-native-reanimated|react-native-chart-kit|@react-native-voice|@react-native-community)/)',
  ],
  testEnvironment: 'node',
  verbose: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Test timeout
  testTimeout: 10000,

  // Global setup and teardown
  globalSetup: '<rootDir>/src/__tests__/globalSetup.ts',
  globalTeardown: '<rootDir>/src/__tests__/globalTeardown.ts',

  // Custom reporters
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/test-results',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
    [
      'jest-html-reporters',
      {
        publicPath: '<rootDir>/test-results',
        filename: 'test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'SAMS Mobile Test Report',
      },
    ],
  ],

  // Performance settings
  maxWorkers: '50%',
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  bail: process.env.CI ? 1 : 0,
  forceExit: true,
  detectOpenHandles: true,

  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
};
