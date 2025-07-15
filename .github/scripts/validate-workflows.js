#!/usr/bin/env node

/**
 * GitHub Workflow Validation Script
 * Validates YAML syntax and workflow configuration
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Colors for console output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(level, message) {
    const timestamp = new Date().toISOString();
    const color = colors[level] || colors.reset;
    console.log(`${color}[${timestamp}] ${level.toUpperCase()}: ${message}${colors.reset}`);
}

function validateWorkflowFile(filePath) {
    log('blue', `Validating workflow: ${filePath}`);
    
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const workflow = yaml.load(content);
        
        // Basic structure validation
        if (!workflow.name) {
            log('red', `Missing 'name' field in ${filePath}`);
            return false;
        }
        
        if (!workflow.on) {
            log('red', `Missing 'on' field in ${filePath}`);
            return false;
        }
        
        if (!workflow.jobs) {
            log('red', `Missing 'jobs' field in ${filePath}`);
            return false;
        }
        
        // Validate jobs
        for (const [jobName, job] of Object.entries(workflow.jobs)) {
            if (!job['runs-on']) {
                log('yellow', `Job '${jobName}' missing 'runs-on' in ${filePath}`);
            }
            
            if (!job.steps || !Array.isArray(job.steps)) {
                log('red', `Job '${jobName}' missing or invalid 'steps' in ${filePath}`);
                return false;
            }
            
            // Validate steps
            job.steps.forEach((step, index) => {
                if (!step.name && !step.uses && !step.run) {
                    log('yellow', `Step ${index} in job '${jobName}' has no name, uses, or run in ${filePath}`);
                }
            });
        }
        
        log('green', `✅ Workflow ${filePath} is valid`);
        return true;
        
    } catch (error) {
        log('red', `❌ Error validating ${filePath}: ${error.message}`);
        return false;
    }
}

function validatePackageJson(filePath, requiredScripts = []) {
    log('blue', `Validating package.json: ${filePath}`);
    
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const pkg = JSON.parse(content);
        
        if (!pkg.scripts) {
            log('red', `Missing 'scripts' field in ${filePath}`);
            return false;
        }
        
        let missingScripts = [];
        requiredScripts.forEach(script => {
            if (!pkg.scripts[script]) {
                missingScripts.push(script);
            }
        });
        
        if (missingScripts.length > 0) {
            log('yellow', `Missing scripts in ${filePath}: ${missingScripts.join(', ')}`);
        } else {
            log('green', `✅ All required scripts present in ${filePath}`);
        }
        
        return missingScripts.length === 0;
        
    } catch (error) {
        log('red', `❌ Error validating ${filePath}: ${error.message}`);
        return false;
    }
}

function checkFileExists(filePath) {
    if (fs.existsSync(filePath)) {
        log('green', `✅ File exists: ${filePath}`);
        return true;
    } else {
        log('red', `❌ File missing: ${filePath}`);
        return false;
    }
}

function main() {
    log('blue', '🔍 Starting SAMS Workflow Validation');
    
    let totalErrors = 0;
    let totalWarnings = 0;
    
    // Validate workflow files
    const workflowDir = '.github/workflows';
    const workflowFiles = [
        'branch-management.yml',
        'sams-advanced-features.yml',
        'sams-backend-ci.yml',
        'sams-frontend-ci.yml',
        'sams-mobile-ci.yml',
        'sams-simple-ci.yml',
        'sams-simple-test.yml'
    ];
    
    log('blue', '📋 Validating workflow files...');
    workflowFiles.forEach(file => {
        const filePath = path.join(workflowDir, file);
        if (!validateWorkflowFile(filePath)) {
            totalErrors++;
        }
    });
    
    // Validate package.json files
    log('blue', '📦 Validating package.json files...');
    
    const packageConfigs = [
        {
            path: 'sams-backend/package.json',
            requiredScripts: ['build', 'test', 'lint', 'start', 'test:coverage']
        },
        {
            path: 'sams-frontend-testing/package.json',
            requiredScripts: ['build', 'test', 'lint', 'start']
        },
        {
            path: 'sams-mobile/TestApp/package.json',
            requiredScripts: ['android', 'ios', 'test', 'lint']
        }
    ];
    
    packageConfigs.forEach(config => {
        if (!validatePackageJson(config.path, config.requiredScripts)) {
            totalWarnings++;
        }
    });
    
    // Check required configuration files
    log('blue', '⚙️  Checking configuration files...');
    
    const requiredFiles = [
        'docker-compose.test.yml',
        'nginx/test.conf',
        '.env.example',
        '.env.test',
        'sams-backend/jest.config.js',
        'sams-backend/src/test/setup.ts',
        'sams-frontend-testing/src/test/setupTests.js',
        'sams-mobile/TestApp/e2e/config.json'
    ];
    
    requiredFiles.forEach(file => {
        if (!checkFileExists(file)) {
            totalWarnings++;
        }
    });
    
    // Summary
    log('blue', '📊 Validation Summary');
    console.log(`${colors.green}✅ Validations passed${colors.reset}`);
    console.log(`${colors.yellow}⚠️  Warnings: ${totalWarnings}${colors.reset}`);
    console.log(`${colors.red}❌ Errors: ${totalErrors}${colors.reset}`);
    
    if (totalErrors > 0) {
        log('red', '🚨 Critical errors found! Please fix before running workflows.');
        process.exit(1);
    } else if (totalWarnings > 0) {
        log('yellow', '⚠️  Some warnings found. Workflows may have reduced functionality.');
        process.exit(0);
    } else {
        log('green', '🎉 All validations passed! Workflows should run successfully.');
        process.exit(0);
    }
}

// Install js-yaml if not present
try {
    require('js-yaml');
} catch (error) {
    console.log('Installing js-yaml dependency...');
    const { execSync } = require('child_process');
    try {
        execSync('npm install js-yaml', { stdio: 'inherit' });
        console.log('js-yaml installed successfully');
    } catch (installError) {
        console.error('Failed to install js-yaml. Please run: npm install js-yaml');
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    validateWorkflowFile,
    validatePackageJson,
    checkFileExists
};
