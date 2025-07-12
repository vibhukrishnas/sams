const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    viewportWidth: 1920,
    viewportHeight: 1080,
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    pageLoadTimeout: 30000,
    
    env: {
      apiUrl: 'http://localhost:8080/api',
      coverage: true,
    },
    
    setupNodeEvents(on, config) {
      // Code coverage
      require('@cypress/code-coverage/task')(on, config);
      
      // Percy visual testing
      on('task', {
        percySnapshot: require('@percy/cypress/task'),
      });
      
      // Custom tasks
      on('task', {
        log(message) {
          console.log(message);
          return null;
        },
        
        clearDatabase() {
          // Clear test database
          return null;
        },
        
        seedDatabase(data) {
          // Seed test database
          return null;
        },
      });
      
      return config;
    },
  },
  
  component: {
    devServer: {
      framework: 'react',
      bundler: 'webpack',
    },
    supportFile: 'cypress/support/component.js',
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
  },
  
  // Global configuration
  retries: {
    runMode: 2,
    openMode: 0,
  },
  
  experimentalStudio: true,
  experimentalWebKitSupport: true,
});
