#!/usr/bin/env node

/**
 * 🔍 SAMS GitHub Actions Workflow Health Check
 * Comprehensive validation and analysis of all workflow files
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
    cyan: '\x1b[36m',
    reset: '\x1b[0m'
};

function log(level, message) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const color = colors[level] || colors.reset;
    console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
}

class WorkflowHealthChecker {
    constructor() {
        this.workflowsDir = path.join(__dirname, '..', 'workflows');
        this.projectRoot = path.join(__dirname, '..', '..');
        this.errors = [];
        this.warnings = [];
        this.recommendations = [];
    }

    // Validate individual workflow file
    validateWorkflow(filePath) {
        log('blue', `🔍 Validating: ${path.basename(filePath)}`);
        
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const workflow = yaml.load(content);
            
            // Basic structure validation
            this.validateBasicStructure(workflow, filePath);
            
            // Action version validation
            this.validateActionVersions(workflow, filePath);
            
            // Environment validation
            this.validateEnvironment(workflow, filePath);
            
            // Job dependencies validation
            this.validateJobDependencies(workflow, filePath);
            
            // Security validation
            this.validateSecurity(workflow, filePath);
            
            log('green', `✅ ${path.basename(filePath)} validation complete`);
            
        } catch (error) {
            this.errors.push(`${filePath}: YAML parsing error - ${error.message}`);
            log('red', `❌ Failed to parse ${path.basename(filePath)}: ${error.message}`);
        }
    }

    validateBasicStructure(workflow, filePath) {
        const fileName = path.basename(filePath);
        
        if (!workflow.name) {
            this.errors.push(`${fileName}: Missing workflow name`);
        }
        
        if (!workflow.on) {
            this.errors.push(`${fileName}: Missing trigger configuration`);
        }
        
        if (!workflow.jobs) {
            this.errors.push(`${fileName}: Missing jobs configuration`);
            return;
        }
        
        // Validate each job
        Object.entries(workflow.jobs).forEach(([jobName, job]) => {
            if (!job['runs-on']) {
                this.errors.push(`${fileName}: Job '${jobName}' missing runs-on`);
            }
            
            if (!job.steps || !Array.isArray(job.steps)) {
                this.errors.push(`${fileName}: Job '${jobName}' missing or invalid steps`);
            }
            
            // Check for proper step naming
            (job.steps || []).forEach((step, index) => {
                if (!step.name && step.uses) {
                    this.warnings.push(`${fileName}: Job '${jobName}' step ${index + 1} missing name`);
                }
            });
        });
    }

    validateActionVersions(workflow, filePath) {
        const fileName = path.basename(filePath);
        const recommendedVersions = {
            'actions/checkout': 'v4',
            'actions/setup-node': 'v4',
            'actions/setup-go': 'v5',
            'actions/setup-python': 'v5',
            'actions/setup-java': 'v4',
            'actions/upload-artifact': 'v4',
            'actions/download-artifact': 'v4',
            'actions/cache': 'v4',
            'docker/setup-buildx-action': 'v3',
            'docker/login-action': 'v3',
            'docker/build-push-action': 'v5',
            'docker/metadata-action': 'v5',
            'ruby/setup-ruby': 'v1'
        };
        
        Object.entries(workflow.jobs || {}).forEach(([jobName, job]) => {
            (job.steps || []).forEach((step, index) => {
                if (step.uses) {
                    const [actionName, version] = step.uses.split('@');
                    const recommendedVersion = recommendedVersions[actionName];
                    
                    if (recommendedVersion && version !== recommendedVersion) {
                        this.warnings.push(
                            `${fileName}: Job '${jobName}' step ${index + 1} uses outdated ${actionName}@${version}, recommend ${recommendedVersion}`
                        );
                    }
                    
                    // Check for deprecated actions (exclude ruby/setup-ruby@v1 which is correct)
                    if ((version === 'v1' || version === 'v2') && actionName !== 'ruby/setup-ruby') {
                        this.warnings.push(
                            `${fileName}: Job '${jobName}' step ${index + 1} uses deprecated version ${step.uses}`
                        );
                    }
                }
            });
        });
    }

    validateEnvironment(workflow, filePath) {
        const fileName = path.basename(filePath);
        
        // Check for recommended environment variables
        const recommendedEnvVars = ['NODE_VERSION', 'GO_VERSION', 'PYTHON_VERSION'];
        
        if (workflow.env) {
            recommendedEnvVars.forEach(envVar => {
                if (fileName.includes('backend') && envVar === 'NODE_VERSION' && !workflow.env[envVar]) {
                    this.recommendations.push(`${fileName}: Consider adding ${envVar} environment variable`);
                }
                if (fileName.includes('docker-agent') && envVar === 'GO_VERSION' && !workflow.env[envVar]) {
                    this.recommendations.push(`${fileName}: Consider adding ${envVar} environment variable`);
                }
            });
        }
    }

    validateJobDependencies(workflow, filePath) {
        const fileName = path.basename(filePath);
        const jobs = workflow.jobs || {};
        const jobNames = Object.keys(jobs);
        
        Object.entries(jobs).forEach(([jobName, job]) => {
            if (job.needs) {
                const dependencies = Array.isArray(job.needs) ? job.needs : [job.needs];
                dependencies.forEach(dep => {
                    if (!jobNames.includes(dep)) {
                        this.errors.push(`${fileName}: Job '${jobName}' depends on non-existent job '${dep}'`);
                    }
                });
            }
        });
    }

    validateSecurity(workflow, filePath) {
        const fileName = path.basename(filePath);
        
        Object.entries(workflow.jobs || {}).forEach(([jobName, job]) => {
            (job.steps || []).forEach((step, index) => {
                // Check for hardcoded secrets
                if (step.env) {
                    Object.entries(step.env).forEach(([key, value]) => {
                        if (typeof value === 'string' && value.includes('password') && !value.includes('secrets.')) {
                            this.warnings.push(`${fileName}: Job '${jobName}' step ${index + 1} may contain hardcoded secret`);
                        }
                    });
                }
                
                // Check for proper secret usage
                if (step.with) {
                    Object.entries(step.with).forEach(([key, value]) => {
                        if (key.toLowerCase().includes('token') && typeof value === 'string' && !value.includes('secrets.')) {
                            this.warnings.push(`${fileName}: Job '${jobName}' step ${index + 1} should use secrets for ${key}`);
                        }
                    });
                }
            });
        });
    }

    // Validate project structure
    validateProjectStructure() {
        log('blue', '📁 Validating project structure...');
        
        const expectedStructure = {
            'sams-backend': ['package.json', 'src', 'tsconfig.json'],
            'sams-mobile/TestApp': ['package.json', 'src', 'android', 'ios'],
            'sams-frontend-testing': ['package.json', 'src'],
            'infrastructure-monitoring-system': ['README.md'],
            'infrastructure-monitoring-system/agents/docker-agent': ['main.go', 'go.mod']
        };
        
        Object.entries(expectedStructure).forEach(([dir, files]) => {
            const fullPath = path.join(this.projectRoot, dir);
            
            if (!fs.existsSync(fullPath)) {
                this.warnings.push(`Expected directory not found: ${dir}`);
                return;
            }
            
            files.forEach(file => {
                const filePath = path.join(fullPath, file);
                if (!fs.existsSync(filePath)) {
                    this.warnings.push(`Expected file not found: ${dir}/${file}`);
                }
            });
        });
    }

    // Validate package.json scripts
    validatePackageScripts() {
        log('blue', '📦 Validating package.json scripts...');
        
        const packagePaths = [
            'sams-backend/package.json',
            'sams-mobile/TestApp/package.json',
            'sams-frontend-testing/package.json'
        ];
        
        const requiredScripts = {
            'sams-backend': ['build', 'test', 'lint', 'start'],
            'sams-mobile/TestApp': ['test', 'lint', 'android', 'ios'],
            'sams-frontend-testing': ['test', 'lint', 'build']
        };
        
        packagePaths.forEach(packagePath => {
            const fullPath = path.join(this.projectRoot, packagePath);
            
            if (!fs.existsSync(fullPath)) {
                this.warnings.push(`Package.json not found: ${packagePath}`);
                return;
            }
            
            try {
                const content = fs.readFileSync(fullPath, 'utf8');
                const pkg = JSON.parse(content);
                
                if (!pkg.scripts) {
                    this.errors.push(`${packagePath}: Missing scripts section`);
                    return;
                }
                
                const projectName = packagePath.split('/')[0];
                const required = requiredScripts[projectName] || [];
                
                required.forEach(script => {
                    if (!pkg.scripts[script]) {
                        this.warnings.push(`${packagePath}: Missing required script '${script}'`);
                    }
                });
                
            } catch (error) {
                this.errors.push(`${packagePath}: Failed to parse - ${error.message}`);
            }
        });
    }

    // Generate comprehensive report
    generateReport() {
        console.log('\n' + '='.repeat(60));
        log('cyan', '📊 SAMS WORKFLOW HEALTH CHECK REPORT');
        console.log('='.repeat(60));
        
        const workflowFiles = fs.readdirSync(this.workflowsDir)
            .filter(file => file.endsWith('.yml') || file.endsWith('.yaml'));
        
        console.log(`\n📈 Summary:`);
        console.log(`   Workflows validated: ${workflowFiles.length}`);
        console.log(`   Errors found: ${this.errors.length}`);
        console.log(`   Warnings found: ${this.warnings.length}`);
        console.log(`   Recommendations: ${this.recommendations.length}`);
        
        if (this.errors.length > 0) {
            console.log('\n❌ ERRORS (Must Fix):');
            this.errors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error}`);
            });
        }
        
        if (this.warnings.length > 0) {
            console.log('\n⚠️  WARNINGS (Should Fix):');
            this.warnings.forEach((warning, index) => {
                console.log(`   ${index + 1}. ${warning}`);
            });
        }
        
        if (this.recommendations.length > 0) {
            console.log('\n💡 RECOMMENDATIONS (Consider):');
            this.recommendations.forEach((rec, index) => {
                console.log(`   ${index + 1}. ${rec}`);
            });
        }
        
        console.log('\n🔧 QUICK FIXES:');
        console.log('   1. Update all actions to latest versions');
        console.log('   2. Add proper step names for better debugging');
        console.log('   3. Use secrets for all sensitive data');
        console.log('   4. Add environment variables for configuration');
        console.log('   5. Ensure all required scripts exist in package.json');
        
        console.log('\n' + '='.repeat(60));
        
        if (this.errors.length > 0) {
            log('red', '🚨 HEALTH CHECK FAILED - Please fix errors above');
            return false;
        } else {
            log('green', '✅ HEALTH CHECK PASSED - All workflows are healthy!');
            return true;
        }
    }

    // Run complete health check
    run() {
        log('cyan', '🚀 Starting SAMS Workflow Health Check...');
        
        // Get all workflow files
        const workflowFiles = fs.readdirSync(this.workflowsDir)
            .filter(file => file.endsWith('.yml') || file.endsWith('.yaml'))
            .map(file => path.join(this.workflowsDir, file));
        
        // Validate each workflow
        workflowFiles.forEach(file => this.validateWorkflow(file));
        
        // Validate project structure
        this.validateProjectStructure();
        
        // Validate package scripts
        this.validatePackageScripts();
        
        // Generate and return report
        return this.generateReport();
    }
}

// Run the health check
if (require.main === module) {
    const checker = new WorkflowHealthChecker();
    const success = checker.run();
    process.exit(success ? 0 : 1);
}

module.exports = WorkflowHealthChecker;
