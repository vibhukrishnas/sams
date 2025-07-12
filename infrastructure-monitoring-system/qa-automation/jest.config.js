/**
 * 🧪 Jest Configuration for QA Automation
 * Comprehensive testing configuration for all test types
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Root directories
  roots: ['<rootDir>/tests'],
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/*.(test|spec).+(ts|tsx|js)'
  ],
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/jest.setup.js'
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'tests/**/*.{js,ts}',
    '!tests/**/*.d.ts',
    '!tests/fixtures/**',
    '!tests/utils/**',
    '!tests/setup/**',
    '!tests/config/**'
  ],
  
  // Coverage directory
  coverageDirectory: 'coverage',
  
  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json',
    'clover'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Test timeout
  testTimeout: 30000,
  
  // Reporters
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './reports',
        filename: 'jest-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'Infrastructure Monitoring QA Report',
        logoImgPath: './assets/logo.png'
      }
    ],
    [
      'jest-junit',
      {
        outputDirectory: './reports',
        outputName: 'junit.xml',
        ancestorSeparator: ' › ',
        uniqueOutputName: 'false',
        suiteNameTemplate: '{filepath}',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}'
      }
    ]
  ],
  
  // Global variables
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  },
  
  // Module name mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/tests/$1',
    '^@utils/(.*)$': '<rootDir>/tests/utils/$1',
    '^@fixtures/(.*)$': '<rootDir>/tests/fixtures/$1',
    '^@config/(.*)$': '<rootDir>/tests/config/$1'
  },
  
  // Test projects for different test types
  projects: [
    {
      displayName: 'Unit Tests',
      testMatch: ['<rootDir>/tests/unit/**/*.test.(js|ts)'],
      testEnvironment: 'node'
    },
    {
      displayName: 'Integration Tests',
      testMatch: ['<rootDir>/tests/integration/**/*.test.(js|ts)'],
      testEnvironment: 'node'
    },
    {
      displayName: 'API Tests',
      testMatch: ['<rootDir>/tests/api/**/*.test.(js|ts)'],
      testEnvironment: 'node'
    },
    {
      displayName: 'Security Tests',
      testMatch: ['<rootDir>/tests/security/**/*.test.(js|ts)'],
      testEnvironment: 'node'
    }
  ],
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Error on deprecated features
  errorOnDeprecated: true,
  
  // Notify mode
  notify: false,
  
  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ]
};
