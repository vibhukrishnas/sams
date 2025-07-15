#!/usr/bin/env node

/**
 * 🏷️ SAMS GitHub Actions Status Badge Generator
 * Generates status badges for README files
 */

const fs = require('fs');
const path = require('path');

class StatusBadgeGenerator {
    constructor() {
        this.repoOwner = 'vibhukrishnas';
        this.repoName = 'sams';
        this.badges = [];
    }

    // Generate workflow status badges
    generateWorkflowBadges() {
        const workflows = [
            {
                name: 'Backend CI/CD',
                file: 'sams-backend-ci.yml',
                branch: 'main'
            },
            {
                name: 'Mobile CI/CD',
                file: 'sams-mobile-ci.yml',
                branch: 'main'
            },
            {
                name: 'Frontend CI/CD',
                file: 'sams-frontend-ci.yml',
                branch: 'main'
            },
            {
                name: 'Docker Agent CI/CD',
                file: 'sams-docker-agent-ci.yml',
                branch: 'main'
            },
            {
                name: 'Infrastructure CI/CD',
                file: 'sams-infrastructure-ci.yml',
                branch: 'main'
            },
            {
                name: 'Advanced Features',
                file: 'sams-advanced-features.yml',
                branch: 'main'
            }
        ];

        workflows.forEach(workflow => {
            const badge = this.createWorkflowBadge(workflow.name, workflow.file, workflow.branch);
            this.badges.push(badge);
        });
    }

    // Create individual workflow badge
    createWorkflowBadge(name, file, branch = 'main') {
        const encodedName = encodeURIComponent(name);
        const url = `https://github.com/${this.repoOwner}/${this.repoName}/actions/workflows/${file}`;
        const badgeUrl = `https://github.com/${this.repoOwner}/${this.repoName}/workflows/${encodedName}/badge.svg?branch=${branch}`;
        
        return {
            name,
            markdown: `[![${name}](${badgeUrl})](${url})`,
            html: `<a href="${url}"><img src="${badgeUrl}" alt="${name}"></a>`
        };
    }

    // Generate quality badges
    generateQualityBadges() {
        const qualityBadges = [
            {
                name: 'Code Quality',
                markdown: `[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=${this.repoOwner}_${this.repoName}&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=${this.repoOwner}_${this.repoName})`
            },
            {
                name: 'Coverage',
                markdown: `[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=${this.repoOwner}_${this.repoName}&metric=coverage)](https://sonarcloud.io/summary/new_code?id=${this.repoOwner}_${this.repoName})`
            },
            {
                name: 'Security Rating',
                markdown: `[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=${this.repoOwner}_${this.repoName}&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=${this.repoOwner}_${this.repoName})`
            },
            {
                name: 'Maintainability',
                markdown: `[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=${this.repoOwner}_${this.repoName}&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=${this.repoOwner}_${this.repoName})`
            }
        ];

        qualityBadges.forEach(badge => {
            this.badges.push(badge);
        });
    }

    // Generate technology badges
    generateTechnologyBadges() {
        const techBadges = [
            {
                name: 'Node.js',
                markdown: '![Node.js](https://img.shields.io/badge/Node.js-18.x-green?logo=node.js)'
            },
            {
                name: 'TypeScript',
                markdown: '![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)'
            },
            {
                name: 'React Native',
                markdown: '![React Native](https://img.shields.io/badge/React%20Native-0.72-blue?logo=react)'
            },
            {
                name: 'Go',
                markdown: '![Go](https://img.shields.io/badge/Go-1.21-blue?logo=go)'
            },
            {
                name: 'Docker',
                markdown: '![Docker](https://img.shields.io/badge/Docker-Enabled-blue?logo=docker)'
            },
            {
                name: 'Kubernetes',
                markdown: '![Kubernetes](https://img.shields.io/badge/Kubernetes-Ready-blue?logo=kubernetes)'
            },
            {
                name: 'PostgreSQL',
                markdown: '![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue?logo=postgresql)'
            },
            {
                name: 'Redis',
                markdown: '![Redis](https://img.shields.io/badge/Redis-7-red?logo=redis)'
            }
        ];

        techBadges.forEach(badge => {
            this.badges.push(badge);
        });
    }

    // Generate project status badges
    generateProjectBadges() {
        const projectBadges = [
            {
                name: 'License',
                markdown: `![License](https://img.shields.io/github/license/${this.repoOwner}/${this.repoName})`
            },
            {
                name: 'Issues',
                markdown: `![Issues](https://img.shields.io/github/issues/${this.repoOwner}/${this.repoName})`
            },
            {
                name: 'Pull Requests',
                markdown: `![Pull Requests](https://img.shields.io/github/issues-pr/${this.repoOwner}/${this.repoName})`
            },
            {
                name: 'Last Commit',
                markdown: `![Last Commit](https://img.shields.io/github/last-commit/${this.repoOwner}/${this.repoName})`
            },
            {
                name: 'Contributors',
                markdown: `![Contributors](https://img.shields.io/github/contributors/${this.repoOwner}/${this.repoName})`
            }
        ];

        projectBadges.forEach(badge => {
            this.badges.push(badge);
        });
    }

    // Generate README section
    generateReadmeSection() {
        let readme = '# 🏷️ SAMS Project Status Badges\n\n';
        
        // Workflow Status
        readme += '## 🚀 CI/CD Pipeline Status\n\n';
        const workflowBadges = this.badges.filter(b => b.name.includes('CI/CD') || b.name.includes('Features'));
        workflowBadges.forEach(badge => {
            readme += `${badge.markdown}\n`;
        });
        
        // Code Quality
        readme += '\n## 📊 Code Quality\n\n';
        const qualityBadges = this.badges.filter(b => 
            b.name.includes('Quality') || b.name.includes('Coverage') || 
            b.name.includes('Security') || b.name.includes('Maintainability')
        );
        qualityBadges.forEach(badge => {
            readme += `${badge.markdown}\n`;
        });
        
        // Technology Stack
        readme += '\n## 🛠️ Technology Stack\n\n';
        const techBadges = this.badges.filter(b => 
            ['Node.js', 'TypeScript', 'React Native', 'Go', 'Docker', 'Kubernetes', 'PostgreSQL', 'Redis'].includes(b.name)
        );
        techBadges.forEach(badge => {
            readme += `${badge.markdown} `;
        });
        readme += '\n';
        
        // Project Info
        readme += '\n## 📈 Project Information\n\n';
        const projectBadges = this.badges.filter(b => 
            ['License', 'Issues', 'Pull Requests', 'Last Commit', 'Contributors'].includes(b.name)
        );
        projectBadges.forEach(badge => {
            readme += `${badge.markdown} `;
        });
        readme += '\n';
        
        return readme;
    }

    // Generate HTML version for documentation
    generateHtmlSection() {
        let html = '<div class="badges">\n';
        
        html += '  <h2>🚀 CI/CD Pipeline Status</h2>\n';
        const workflowBadges = this.badges.filter(b => b.html && (b.name.includes('CI/CD') || b.name.includes('Features')));
        workflowBadges.forEach(badge => {
            html += `  ${badge.html}\n`;
        });
        
        html += '\n  <h2>📊 Code Quality</h2>\n';
        const qualityBadges = this.badges.filter(b => b.html && 
            (b.name.includes('Quality') || b.name.includes('Coverage') || 
             b.name.includes('Security') || b.name.includes('Maintainability'))
        );
        qualityBadges.forEach(badge => {
            html += `  ${badge.html}\n`;
        });
        
        html += '</div>\n';
        
        return html;
    }

    // Save badges to files
    saveBadges() {
        const outputDir = path.join(__dirname, '..', 'badges');
        
        // Create badges directory if it doesn't exist
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Save README section
        const readmeSection = this.generateReadmeSection();
        fs.writeFileSync(path.join(outputDir, 'README_BADGES.md'), readmeSection);
        
        // Save HTML section
        const htmlSection = this.generateHtmlSection();
        fs.writeFileSync(path.join(outputDir, 'badges.html'), htmlSection);
        
        // Save JSON data
        const jsonData = {
            generated: new Date().toISOString(),
            repository: `${this.repoOwner}/${this.repoName}`,
            badges: this.badges
        };
        fs.writeFileSync(path.join(outputDir, 'badges.json'), JSON.stringify(jsonData, null, 2));
        
        console.log('✅ Status badges generated successfully!');
        console.log(`📁 Output directory: ${outputDir}`);
        console.log('📄 Files created:');
        console.log('   - README_BADGES.md (Markdown format)');
        console.log('   - badges.html (HTML format)');
        console.log('   - badges.json (JSON data)');
    }

    // Generate all badges
    generate() {
        console.log('🏷️ Generating SAMS project status badges...');
        
        this.generateWorkflowBadges();
        this.generateQualityBadges();
        this.generateTechnologyBadges();
        this.generateProjectBadges();
        
        this.saveBadges();
        
        return this.badges;
    }

    // Update main README.md
    updateMainReadme() {
        const readmePath = path.join(__dirname, '..', '..', 'README.md');
        
        if (!fs.existsSync(readmePath)) {
            console.log('⚠️  README.md not found, creating new one...');
            const newReadme = this.generateReadmeSection();
            fs.writeFileSync(readmePath, newReadme);
            return;
        }
        
        let readme = fs.readFileSync(readmePath, 'utf8');
        const badgeSection = this.generateReadmeSection();
        
        // Replace existing badge section or add at the top
        const badgeStart = '# 🏷️ SAMS Project Status Badges';
        const badgeEnd = '\n## ';
        
        if (readme.includes(badgeStart)) {
            const startIndex = readme.indexOf(badgeStart);
            const endIndex = readme.indexOf(badgeEnd, startIndex + badgeStart.length);
            
            if (endIndex !== -1) {
                readme = readme.substring(0, startIndex) + badgeSection + readme.substring(endIndex);
            } else {
                readme = readme.substring(0, startIndex) + badgeSection;
            }
        } else {
            readme = badgeSection + '\n' + readme;
        }
        
        fs.writeFileSync(readmePath, readme);
        console.log('✅ Main README.md updated with status badges');
    }
}

// Run the generator
if (require.main === module) {
    const generator = new StatusBadgeGenerator();
    generator.generate();
    generator.updateMainReadme();
}

module.exports = StatusBadgeGenerator;
