#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Beta Testing Management System
 * Manages TestFlight and Google Play Console beta testing
 */

class BetaTestingManager {
  constructor() {
    this.config = {
      app: {
        name: 'SAMS Monitor',
        bundleId: 'com.sams.monitor',
        version: '1.0.0',
        buildNumber: '1',
      },
      testFlight: {
        teamId: process.env.APPLE_TEAM_ID,
        appId: process.env.TESTFLIGHT_APP_ID,
        apiKey: process.env.APP_STORE_CONNECT_API_KEY,
        apiKeyId: process.env.APP_STORE_CONNECT_API_KEY_ID,
        issuerId: process.env.APP_STORE_CONNECT_ISSUER_ID,
        groups: [
          {
            name: 'Internal Testing',
            description: 'SAMS development team and QA',
            maxTesters: 25,
            autoNotify: true,
            betaReviewRequired: false,
          },
          {
            name: 'Partner Beta',
            description: 'Trusted partner organizations',
            maxTesters: 100,
            autoNotify: true,
            betaReviewRequired: true,
          },
          {
            name: 'Public Beta',
            description: 'Public beta testing program',
            maxTesters: 1000,
            autoNotify: false,
            betaReviewRequired: true,
          },
        ],
      },
      googlePlay: {
        serviceAccountKey: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY,
        packageName: 'com.sams.monitor',
        tracks: [
          {
            name: 'internal',
            description: 'Internal team testing',
            maxTesters: 100,
            rolloutPercentage: 100,
          },
          {
            name: 'alpha',
            description: 'Closed alpha testing',
            maxTesters: 500,
            rolloutPercentage: 100,
          },
          {
            name: 'beta',
            description: 'Open beta testing',
            maxTesters: 5000,
            rolloutPercentage: 50,
          },
        ],
      },
      feedback: {
        channels: ['email', 'in-app', 'slack', 'github'],
        autoResponse: true,
        escalationRules: {
          critical: 'immediate',
          high: '4 hours',
          medium: '24 hours',
          low: '72 hours',
        },
      },
      outputDir: './beta-testing',
    };
    
    this.testers = {
      internal: [],
      alpha: [],
      beta: [],
      public: [],
    };
    
    this.builds = [];
    this.feedback = [];
  }

  /**
   * Initialize beta testing program
   */
  async initialize() {
    console.log('🚀 Initializing beta testing program...');
    
    try {
      await this.setupEnvironment();
      await this.loadExistingData();
      await this.validateConfiguration();
      
      console.log('✅ Beta testing program initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize beta testing:', error);
      throw error;
    }
  }

  /**
   * Setup environment for beta testing
   */
  async setupEnvironment() {
    console.log('🔧 Setting up beta testing environment...');
    
    // Create output directories
    const dirs = [
      this.config.outputDir,
      `${this.config.outputDir}/builds`,
      `${this.config.outputDir}/testers`,
      `${this.config.outputDir}/feedback`,
      `${this.config.outputDir}/reports`,
      `${this.config.outputDir}/releases`,
    ];
    
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
    
    // Install required tools
    await this.installRequiredTools();
  }

  /**
   * Install required tools for beta testing
   */
  async installRequiredTools() {
    const tools = [
      { name: 'fastlane', check: 'fastlane --version', install: 'gem install fastlane' },
      { name: 'app-store-connect-api', check: 'which spaceship', install: 'gem install spaceship' },
    ];
    
    for (const tool of tools) {
      try {
        execSync(tool.check, { stdio: 'ignore' });
        console.log(`✅ ${tool.name} is available`);
      } catch (error) {
        console.log(`📦 Installing ${tool.name}...`);
        try {
          execSync(tool.install, { stdio: 'inherit' });
        } catch (installError) {
          console.warn(`⚠️ Failed to install ${tool.name}:`, installError.message);
        }
      }
    }
  }

  /**
   * Load existing beta testing data
   */
  async loadExistingData() {
    console.log('📂 Loading existing beta testing data...');
    
    // Load testers
    const testersFile = `${this.config.outputDir}/testers/testers.json`;
    if (fs.existsSync(testersFile)) {
      this.testers = JSON.parse(fs.readFileSync(testersFile, 'utf8'));
    }
    
    // Load builds
    const buildsFile = `${this.config.outputDir}/builds/builds.json`;
    if (fs.existsSync(buildsFile)) {
      this.builds = JSON.parse(fs.readFileSync(buildsFile, 'utf8'));
    }
    
    // Load feedback
    const feedbackFile = `${this.config.outputDir}/feedback/feedback.json`;
    if (fs.existsSync(feedbackFile)) {
      this.feedback = JSON.parse(fs.readFileSync(feedbackFile, 'utf8'));
    }
  }

  /**
   * Validate configuration
   */
  async validateConfiguration() {
    console.log('✅ Validating configuration...');
    
    const errors = [];
    
    // Check TestFlight configuration
    if (!this.config.testFlight.teamId) {
      errors.push('Missing Apple Team ID (APPLE_TEAM_ID)');
    }
    
    if (!this.config.testFlight.apiKey) {
      errors.push('Missing App Store Connect API Key (APP_STORE_CONNECT_API_KEY)');
    }
    
    // Check Google Play configuration
    if (!this.config.googlePlay.serviceAccountKey) {
      errors.push('Missing Google Play Service Account Key (GOOGLE_PLAY_SERVICE_ACCOUNT_KEY)');
    }
    
    if (errors.length > 0) {
      console.warn('⚠️ Configuration warnings:');
      errors.forEach(error => console.warn(`  - ${error}`));
      console.warn('Some features may not work without proper configuration.');
    }
  }

  /**
   * Create new beta build
   */
  async createBetaBuild(platform, track = 'internal') {
    console.log(`🔨 Creating ${platform} beta build for ${track} track...`);
    
    const buildInfo = {
      id: `build-${Date.now()}`,
      platform,
      track,
      version: this.config.app.version,
      buildNumber: this.getNextBuildNumber(),
      timestamp: new Date().toISOString(),
      status: 'building',
      releaseNotes: this.generateReleaseNotes(),
    };
    
    try {
      if (platform === 'ios') {
        await this.buildIOSBeta(buildInfo);
      } else if (platform === 'android') {
        await this.buildAndroidBeta(buildInfo);
      }
      
      buildInfo.status = 'completed';
      this.builds.push(buildInfo);
      await this.saveBuildData();
      
      console.log(`✅ Beta build ${buildInfo.id} created successfully`);
      return buildInfo;
      
    } catch (error) {
      buildInfo.status = 'failed';
      buildInfo.error = error.message;
      this.builds.push(buildInfo);
      await this.saveBuildData();
      
      console.error(`❌ Failed to create beta build:`, error);
      throw error;
    }
  }

  /**
   * Build iOS beta
   */
  async buildIOSBeta(buildInfo) {
    console.log('🍎 Building iOS beta...');
    
    // Create Fastfile for iOS beta
    const fastfile = this.generateIOSFastfile(buildInfo);
    fs.writeFileSync('./fastlane/Fastfile', fastfile);
    
    // Run Fastlane
    execSync('fastlane ios beta', { stdio: 'inherit', cwd: '.' });
    
    buildInfo.artifactPath = `./ios/build/SAMS-${buildInfo.buildNumber}.ipa`;
  }

  /**
   * Build Android beta
   */
  async buildAndroidBeta(buildInfo) {
    console.log('🤖 Building Android beta...');
    
    // Build AAB for Google Play
    execSync('./gradlew bundleRelease', { stdio: 'inherit', cwd: './android' });
    
    buildInfo.artifactPath = `./android/app/build/outputs/bundle/release/app-release.aab`;
    
    // Upload to Google Play Console
    await this.uploadToGooglePlay(buildInfo);
  }

  /**
   * Generate iOS Fastfile
   */
  generateIOSFastfile(buildInfo) {
    return `
default_platform(:ios)

platform :ios do
  desc "Build and upload beta to TestFlight"
  lane :beta do
    # Increment build number
    increment_build_number(
      build_number: "${buildInfo.buildNumber}",
      xcodeproj: "ios/TestApp.xcodeproj"
    )
    
    # Build the app
    build_app(
      workspace: "ios/TestApp.xcworkspace",
      scheme: "TestApp",
      configuration: "Release",
      export_method: "app-store",
      output_directory: "./ios/build",
      output_name: "SAMS-${buildInfo.buildNumber}.ipa"
    )
    
    # Upload to TestFlight
    upload_to_testflight(
      api_key_path: "${this.config.testFlight.apiKey}",
      skip_waiting_for_build_processing: true,
      changelog: "${buildInfo.releaseNotes.replace(/"/g, '\\"')}"
    )
  end
end
`;
  }

  /**
   * Upload to Google Play Console
   */
  async uploadToGooglePlay(buildInfo) {
    console.log('📤 Uploading to Google Play Console...');
    
    // This would use Google Play Developer API
    // For now, we'll create a placeholder script
    const uploadScript = `
#!/bin/bash
# Google Play Console Upload Script
# This script would use the Google Play Developer API to upload the AAB

echo "Uploading ${buildInfo.artifactPath} to ${buildInfo.track} track..."
echo "Package: ${this.config.googlePlay.packageName}"
echo "Version: ${buildInfo.version} (${buildInfo.buildNumber})"
echo "Release Notes: ${buildInfo.releaseNotes}"

# Actual upload would happen here using Google Play API
echo "✅ Upload completed successfully"
`;
    
    fs.writeFileSync(`${this.config.outputDir}/builds/upload-${buildInfo.id}.sh`, uploadScript);
    execSync(`chmod +x ${this.config.outputDir}/builds/upload-${buildInfo.id}.sh`);
  }

  /**
   * Manage beta testers
   */
  async manageBetaTesters(action, platform, track, testers) {
    console.log(`👥 ${action} beta testers for ${platform} ${track}...`);
    
    switch (action) {
      case 'add':
        await this.addBetaTesters(platform, track, testers);
        break;
      case 'remove':
        await this.removeBetaTesters(platform, track, testers);
        break;
      case 'list':
        return this.listBetaTesters(platform, track);
      case 'invite':
        await this.inviteBetaTesters(platform, track, testers);
        break;
    }
  }

  /**
   * Add beta testers
   */
  async addBetaTesters(platform, track, newTesters) {
    if (!this.testers[track]) {
      this.testers[track] = [];
    }
    
    for (const tester of newTesters) {
      const testerInfo = {
        id: `tester-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        email: tester.email,
        firstName: tester.firstName,
        lastName: tester.lastName,
        platform,
        track,
        status: 'invited',
        invitedAt: new Date().toISOString(),
        ...tester,
      };
      
      this.testers[track].push(testerInfo);
    }
    
    await this.saveTesterData();
    console.log(`✅ Added ${newTesters.length} testers to ${track} track`);
  }

  /**
   * Remove beta testers
   */
  async removeBetaTesters(platform, track, testerEmails) {
    if (!this.testers[track]) return;
    
    this.testers[track] = this.testers[track].filter(
      tester => !testerEmails.includes(tester.email)
    );
    
    await this.saveTesterData();
    console.log(`✅ Removed ${testerEmails.length} testers from ${track} track`);
  }

  /**
   * List beta testers
   */
  listBetaTesters(platform, track) {
    if (!this.testers[track]) return [];
    
    return this.testers[track].filter(tester => 
      !platform || tester.platform === platform
    );
  }

  /**
   * Invite beta testers
   */
  async inviteBetaTesters(platform, track, testerEmails) {
    console.log(`📧 Sending invitations to ${testerEmails.length} testers...`);
    
    for (const email of testerEmails) {
      const tester = this.testers[track]?.find(t => t.email === email);
      if (tester) {
        await this.sendBetaInvitation(tester, platform, track);
        tester.status = 'invited';
        tester.invitedAt = new Date().toISOString();
      }
    }
    
    await this.saveTesterData();
    console.log(`✅ Invitations sent successfully`);
  }

  /**
   * Send beta invitation
   */
  async sendBetaInvitation(tester, platform, track) {
    const invitation = {
      to: tester.email,
      subject: `You're invited to beta test SAMS Monitor`,
      body: this.generateInvitationEmail(tester, platform, track),
    };
    
    // Save invitation for manual sending or integration with email service
    const invitationFile = `${this.config.outputDir}/testers/invitation-${tester.id}.json`;
    fs.writeFileSync(invitationFile, JSON.stringify(invitation, null, 2));
    
    console.log(`📧 Invitation prepared for ${tester.email}`);
  }

  /**
   * Generate invitation email
   */
  generateInvitationEmail(tester, platform, track) {
    return `
Hi ${tester.firstName},

You've been invited to beta test SAMS Monitor, our enterprise server monitoring and alert management application.

As a ${track} beta tester, you'll get early access to new features and help us improve the app before its public release.

Getting Started:
${platform === 'ios' ? 
  '1. Install TestFlight from the App Store\n2. Click the invitation link we\'ll send separately\n3. Install SAMS Monitor beta' :
  '1. Join our Google Play beta program\n2. Download SAMS Monitor from Google Play\n3. Start testing!'
}

What to Test:
• Real-time server monitoring
• Alert management and notifications
• Voice command features
• Analytics and reporting
• Overall user experience

How to Provide Feedback:
• Use the in-app feedback feature
• Email us at beta@sams-monitor.com
• Report bugs through TestFlight/Google Play

Thank you for helping us make SAMS Monitor better!

Best regards,
The SAMS Monitor Team
`;
  }

  /**
   * Collect and manage feedback
   */
  async collectFeedback(feedbackData) {
    console.log('📝 Collecting beta feedback...');
    
    const feedback = {
      id: `feedback-${Date.now()}`,
      timestamp: new Date().toISOString(),
      tester: feedbackData.tester,
      platform: feedbackData.platform,
      version: feedbackData.version,
      type: feedbackData.type, // bug, feature, improvement, general
      severity: feedbackData.severity, // critical, high, medium, low
      title: feedbackData.title,
      description: feedbackData.description,
      steps: feedbackData.steps,
      expected: feedbackData.expected,
      actual: feedbackData.actual,
      attachments: feedbackData.attachments || [],
      status: 'new',
      assignee: null,
      resolution: null,
    };
    
    this.feedback.push(feedback);
    await this.saveFeedbackData();
    
    // Auto-escalate critical issues
    if (feedback.severity === 'critical') {
      await this.escalateFeedback(feedback);
    }
    
    console.log(`✅ Feedback ${feedback.id} collected`);
    return feedback;
  }

  /**
   * Escalate critical feedback
   */
  async escalateFeedback(feedback) {
    console.log(`🚨 Escalating critical feedback: ${feedback.id}`);
    
    // Create escalation notification
    const escalation = {
      feedbackId: feedback.id,
      escalatedAt: new Date().toISOString(),
      escalatedTo: 'development-team',
      reason: 'Critical severity',
      notification: {
        channels: ['slack', 'email'],
        message: `Critical feedback received: ${feedback.title}`,
      },
    };
    
    // Save escalation
    const escalationFile = `${this.config.outputDir}/feedback/escalation-${feedback.id}.json`;
    fs.writeFileSync(escalationFile, JSON.stringify(escalation, null, 2));
  }

  /**
   * Generate beta testing reports
   */
  async generateReports() {
    console.log('📊 Generating beta testing reports...');
    
    const reports = {
      summary: this.generateSummaryReport(),
      testers: this.generateTesterReport(),
      feedback: this.generateFeedbackReport(),
      builds: this.generateBuildReport(),
    };
    
    // Save reports
    for (const [type, report] of Object.entries(reports)) {
      const reportFile = `${this.config.outputDir}/reports/${type}-report.json`;
      fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
      
      // Generate HTML version
      const htmlReport = this.generateHtmlReport(type, report);
      const htmlFile = `${this.config.outputDir}/reports/${type}-report.html`;
      fs.writeFileSync(htmlFile, htmlReport);
    }
    
    console.log('✅ Beta testing reports generated');
    return reports;
  }

  /**
   * Generate summary report
   */
  generateSummaryReport() {
    const totalTesters = Object.values(this.testers).reduce((sum, track) => sum + track.length, 0);
    const totalBuilds = this.builds.length;
    const totalFeedback = this.feedback.length;
    
    return {
      timestamp: new Date().toISOString(),
      overview: {
        totalTesters,
        totalBuilds,
        totalFeedback,
        activeTracks: Object.keys(this.testers).length,
      },
      testersByTrack: Object.fromEntries(
        Object.entries(this.testers).map(([track, testers]) => [track, testers.length])
      ),
      buildsByPlatform: this.builds.reduce((acc, build) => {
        acc[build.platform] = (acc[build.platform] || 0) + 1;
        return acc;
      }, {}),
      feedbackBySeverity: this.feedback.reduce((acc, feedback) => {
        acc[feedback.severity] = (acc[feedback.severity] || 0) + 1;
        return acc;
      }, {}),
    };
  }

  /**
   * Generate tester report
   */
  generateTesterReport() {
    return {
      timestamp: new Date().toISOString(),
      tracks: Object.fromEntries(
        Object.entries(this.testers).map(([track, testers]) => [
          track,
          {
            total: testers.length,
            active: testers.filter(t => t.status === 'active').length,
            invited: testers.filter(t => t.status === 'invited').length,
            platforms: testers.reduce((acc, tester) => {
              acc[tester.platform] = (acc[tester.platform] || 0) + 1;
              return acc;
            }, {}),
          },
        ])
      ),
    };
  }

  /**
   * Generate feedback report
   */
  generateFeedbackReport() {
    return {
      timestamp: new Date().toISOString(),
      total: this.feedback.length,
      byType: this.feedback.reduce((acc, feedback) => {
        acc[feedback.type] = (acc[feedback.type] || 0) + 1;
        return acc;
      }, {}),
      bySeverity: this.feedback.reduce((acc, feedback) => {
        acc[feedback.severity] = (acc[feedback.severity] || 0) + 1;
        return acc;
      }, {}),
      byStatus: this.feedback.reduce((acc, feedback) => {
        acc[feedback.status] = (acc[feedback.status] || 0) + 1;
        return acc;
      }, {}),
      recent: this.feedback
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10),
    };
  }

  /**
   * Generate build report
   */
  generateBuildReport() {
    return {
      timestamp: new Date().toISOString(),
      total: this.builds.length,
      successful: this.builds.filter(b => b.status === 'completed').length,
      failed: this.builds.filter(b => b.status === 'failed').length,
      byPlatform: this.builds.reduce((acc, build) => {
        acc[build.platform] = (acc[build.platform] || 0) + 1;
        return acc;
      }, {}),
      recent: this.builds
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10),
    };
  }

  /**
   * Generate HTML report
   */
  generateHtmlReport(type, data) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>SAMS Monitor Beta Testing - ${type.charAt(0).toUpperCase() + type.slice(1)} Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #1976D2; color: white; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 5px; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: white; border-radius: 3px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>SAMS Monitor Beta Testing</h1>
        <h2>${type.charAt(0).toUpperCase() + type.slice(1)} Report</h2>
        <p>Generated: ${data.timestamp}</p>
    </div>
    
    <div class="section">
        <h3>Report Data</h3>
        <pre>${JSON.stringify(data, null, 2)}</pre>
    </div>
</body>
</html>`;
  }

  /**
   * Save data methods
   */
  async saveBuildData() {
    const buildsFile = `${this.config.outputDir}/builds/builds.json`;
    fs.writeFileSync(buildsFile, JSON.stringify(this.builds, null, 2));
  }

  async saveTesterData() {
    const testersFile = `${this.config.outputDir}/testers/testers.json`;
    fs.writeFileSync(testersFile, JSON.stringify(this.testers, null, 2));
  }

  async saveFeedbackData() {
    const feedbackFile = `${this.config.outputDir}/feedback/feedback.json`;
    fs.writeFileSync(feedbackFile, JSON.stringify(this.feedback, null, 2));
  }

  /**
   * Utility methods
   */
  getNextBuildNumber() {
    const lastBuild = this.builds
      .filter(b => b.version === this.config.app.version)
      .sort((a, b) => parseInt(b.buildNumber) - parseInt(a.buildNumber))[0];
    
    return lastBuild ? (parseInt(lastBuild.buildNumber) + 1).toString() : '1';
  }

  generateReleaseNotes() {
    return `
Beta Release ${this.config.app.version}

New Features:
• Enhanced alert management with voice commands
• Improved analytics dashboard
• Better offline functionality
• Performance optimizations

Bug Fixes:
• Fixed notification delivery issues
• Resolved memory leaks
• Improved app stability

Known Issues:
• Voice commands may not work in noisy environments
• Some analytics charts may load slowly on older devices

Please report any issues through the app or email beta@sams-monitor.com
`;
  }
}

// CLI interface
if (require.main === module) {
  const manager = new BetaTestingManager();
  const args = process.argv.slice(2);
  const command = args[0];
  
  async function runCommand() {
    await manager.initialize();
    
    switch (command) {
      case 'build':
        const platform = args[1] || 'ios';
        const track = args[2] || 'internal';
        await manager.createBetaBuild(platform, track);
        break;
        
      case 'testers':
        const action = args[1] || 'list';
        const testerPlatform = args[2] || 'ios';
        const testerTrack = args[3] || 'internal';
        const result = await manager.manageBetaTesters(action, testerPlatform, testerTrack, []);
        if (result) console.log(JSON.stringify(result, null, 2));
        break;
        
      case 'reports':
        const reports = await manager.generateReports();
        console.log('Reports generated:', Object.keys(reports));
        break;
        
      default:
        console.log(`
Usage: node beta-testing-manager.js <command> [options]

Commands:
  build <platform> <track>     Create beta build
  testers <action> <platform> <track>  Manage testers
  reports                      Generate reports

Examples:
  node beta-testing-manager.js build ios internal
  node beta-testing-manager.js testers list ios beta
  node beta-testing-manager.js reports
`);
    }
  }
  
  runCommand().catch(error => {
    console.error('Command failed:', error);
    process.exit(1);
  });
}

module.exports = BetaTestingManager;
