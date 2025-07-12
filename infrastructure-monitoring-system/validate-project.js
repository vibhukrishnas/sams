#!/usr/bin/env node

/**
 * 🔍 Project Structure Validation Script
 * Validates the complete infrastructure monitoring project setup
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Validation results
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  details: []
};

// Helper functions
function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
  results.passed++;
}

function logError(message) {
  log(`❌ ${message}`, 'red');
  results.failed++;
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
  results.warnings++;
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function checkFileExists(filePath, description) {
  if (fs.existsSync(filePath)) {
    logSuccess(`${description} exists: ${filePath}`);
    return true;
  } else {
    logError(`${description} missing: ${filePath}`);
    return false;
  }
}

function checkDirectoryExists(dirPath, description) {
  if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
    logSuccess(`${description} directory exists: ${dirPath}`);
    return true;
  } else {
    logError(`${description} directory missing: ${dirPath}`);
    return false;
  }
}

function checkPackageJson(filePath, requiredDeps = []) {
  if (!checkFileExists(filePath, 'package.json')) {
    return false;
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Check basic fields
    if (packageJson.name) {
      logSuccess(`Package name: ${packageJson.name}`);
    } else {
      logError('Package name missing in package.json');
    }

    if (packageJson.version) {
      logSuccess(`Package version: ${packageJson.version}`);
    } else {
      logError('Package version missing in package.json');
    }

    // Check dependencies
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    requiredDeps.forEach(dep => {
      if (allDeps[dep]) {
        logSuccess(`Required dependency found: ${dep}@${allDeps[dep]}`);
      } else {
        logError(`Required dependency missing: ${dep}`);
      }
    });

    return true;
  } catch (error) {
    logError(`Invalid package.json: ${error.message}`);
    return false;
  }
}

// Main validation function
function validateProject() {
  log('\n🚀 Infrastructure Monitoring System - Project Validation', 'bold');
  log('=' * 60, 'cyan');

  // 1. Validate root structure
  log('\n📁 Validating Root Project Structure...', 'magenta');
  
  const rootFiles = [
    'README.md',
    'validate-project.js'
  ];

  const rootDirs = [
    'backend',
    'mobile-app',
    'qa-automation'
  ];

  rootFiles.forEach(file => {
    checkFileExists(file, 'Root file');
  });

  rootDirs.forEach(dir => {
    checkDirectoryExists(dir, 'Root directory');
  });

  // 2. Validate Backend Structure
  log('\n🔧 Validating Backend Structure...', 'magenta');
  
  const backendFiles = [
    'backend/package.json',
    'backend/server.js',
    'backend/.env.example'
  ];

  const backendDirs = [
    'backend/src',
    'backend/src/config',
    'backend/src/controllers',
    'backend/src/models',
    'backend/src/routes',
    'backend/src/middleware',
    'backend/src/services',
    'backend/src/utils'
  ];

  const backendRequiredDeps = [
    'express',
    'mongoose',
    'pg',
    'sequelize',
    'jsonwebtoken',
    'bcryptjs',
    'socket.io',
    'cors',
    'helmet'
  ];

  backendFiles.forEach(file => {
    checkFileExists(file, 'Backend file');
  });

  backendDirs.forEach(dir => {
    checkDirectoryExists(dir, 'Backend directory');
  });

  checkPackageJson('backend/package.json', backendRequiredDeps);

  // 3. Validate Mobile App Structure
  log('\n📱 Validating Mobile App Structure...', 'magenta');
  
  const mobileFiles = [
    'mobile-app/package.json',
    'mobile-app/App.tsx'
  ];

  const mobileDirs = [
    'mobile-app/src',
    'mobile-app/src/components',
    'mobile-app/src/screens',
    'mobile-app/src/navigation',
    'mobile-app/src/services',
    'mobile-app/src/utils',
    'mobile-app/src/assets'
  ];

  const mobileRequiredDeps = [
    'react',
    'react-native',
    '@react-navigation/native',
    '@react-navigation/stack',
    '@react-navigation/bottom-tabs',
    '@reduxjs/toolkit',
    'react-redux'
  ];

  mobileFiles.forEach(file => {
    checkFileExists(file, 'Mobile app file');
  });

  mobileDirs.forEach(dir => {
    checkDirectoryExists(dir, 'Mobile app directory');
  });

  checkPackageJson('mobile-app/package.json', mobileRequiredDeps);

  // 4. Validate QA Automation Structure
  log('\n🧪 Validating QA Automation Structure...', 'magenta');
  
  const qaFiles = [
    'qa-automation/package.json',
    'qa-automation/jest.config.js',
    'qa-automation/playwright.config.ts'
  ];

  const qaDirs = [
    'qa-automation/tests',
    'qa-automation/tests/unit',
    'qa-automation/tests/integration',
    'qa-automation/tests/e2e',
    'qa-automation/tests/api',
    'qa-automation/tests/performance',
    'qa-automation/tests/security'
  ];

  const qaRequiredDeps = [
    'jest',
    '@playwright/test',
    'detox',
    'supertest',
    'artillery'
  ];

  qaFiles.forEach(file => {
    checkFileExists(file, 'QA automation file');
  });

  qaDirs.forEach(dir => {
    checkDirectoryExists(dir, 'QA automation directory');
  });

  checkPackageJson('qa-automation/package.json', qaRequiredDeps);

  // 5. Validate Configuration Files
  log('\n⚙️  Validating Configuration Files...', 'magenta');
  
  const configFiles = [
    'backend/src/config/mongodb.js',
    'backend/src/config/postgresql.js',
    'backend/src/config/redis.js',
    'backend/src/config/logger.js',
    'mobile-app/src/navigation/AppNavigator.tsx'
  ];

  configFiles.forEach(file => {
    checkFileExists(file, 'Configuration file');
  });

  // 6. Generate Summary Report
  log('\n📊 Validation Summary', 'bold');
  log('=' * 40, 'cyan');
  
  logSuccess(`Passed: ${results.passed}`);
  if (results.failed > 0) {
    logError(`Failed: ${results.failed}`);
  }
  if (results.warnings > 0) {
    logWarning(`Warnings: ${results.warnings}`);
  }

  const totalChecks = results.passed + results.failed + results.warnings;
  const successRate = ((results.passed / totalChecks) * 100).toFixed(1);
  
  log(`\nSuccess Rate: ${successRate}%`, successRate >= 90 ? 'green' : successRate >= 70 ? 'yellow' : 'red');

  if (results.failed === 0) {
    log('\n🎉 Project validation completed successfully!', 'green');
    log('All required files and directories are in place.', 'green');
  } else {
    log('\n⚠️  Project validation completed with issues.', 'yellow');
    log('Please address the missing files and directories before proceeding.', 'yellow');
  }

  // 7. Next Steps
  log('\n🚀 Next Steps:', 'bold');
  log('1. Install dependencies:', 'cyan');
  log('   cd backend && npm install', 'white');
  log('   cd mobile-app && npm install', 'white');
  log('   cd qa-automation && npm install', 'white');
  log('\n2. Set up environment variables:', 'cyan');
  log('   cp backend/.env.example backend/.env', 'white');
  log('   # Edit backend/.env with your configuration', 'white');
  log('\n3. Start development servers:', 'cyan');
  log('   cd backend && npm run dev', 'white');
  log('   cd mobile-app && npm start', 'white');
  log('\n4. Run tests:', 'cyan');
  log('   cd qa-automation && npm test', 'white');

  return results.failed === 0;
}

// Create missing directories
function createMissingDirectories() {
  log('\n🔧 Creating missing directories...', 'magenta');

  const requiredDirs = [
    'backend/src/controllers',
    'backend/src/models',
    'backend/src/routes',
    'backend/src/middleware',
    'backend/src/services',
    'backend/src/utils',
    'backend/logs',
    'mobile-app/src/components',
    'mobile-app/src/screens',
    'mobile-app/src/screens/auth',
    'mobile-app/src/screens/dashboard',
    'mobile-app/src/screens/servers',
    'mobile-app/src/screens/alerts',
    'mobile-app/src/screens/metrics',
    'mobile-app/src/screens/settings',
    'mobile-app/src/screens/profile',
    'mobile-app/src/screens/notifications',
    'mobile-app/src/services',
    'mobile-app/src/utils',
    'mobile-app/src/assets',
    'mobile-app/src/store',
    'mobile-app/src/theme',
    'qa-automation/tests',
    'qa-automation/tests/unit',
    'qa-automation/tests/integration',
    'qa-automation/tests/e2e',
    'qa-automation/tests/api',
    'qa-automation/tests/performance',
    'qa-automation/tests/security',
    'qa-automation/tests/setup',
    'qa-automation/tests/utils',
    'qa-automation/tests/fixtures',
    'qa-automation/reports'
  ];

  requiredDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        logSuccess(`Created directory: ${dir}`);
      } catch (error) {
        logError(`Failed to create directory ${dir}: ${error.message}`);
      }
    }
  });
}

// Run validation
if (require.main === module) {
  createMissingDirectories();
  const success = validateProject();
  process.exit(success ? 0 : 1);
}

module.exports = { validateProject, createMissingDirectories };
