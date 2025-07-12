/**
 * SAMS Mobile - Screenshot Generation Script
 * Automated screenshot generation for app store listings
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'app-store', 'screenshots');
const DEVICES = {
  ios: [
    { name: 'iPhone 14 Pro Max', size: '1290x2796', simulator: 'iPhone 14 Pro Max' },
    { name: 'iPhone 14 Pro', size: '1179x2556', simulator: 'iPhone 14 Pro' },
    { name: 'iPhone 8 Plus', size: '1242x2208', simulator: 'iPhone 8 Plus' },
    { name: 'iPad Pro 12.9', size: '2048x2732', simulator: 'iPad Pro (12.9-inch) (6th generation)' },
  ],
  android: [
    { name: 'Pixel 6 Pro', size: '1440x3120', emulator: 'Pixel_6_Pro_API_33' },
    { name: 'Pixel 4', size: '1080x2280', emulator: 'Pixel_4_API_30' },
    { name: 'Nexus 10', size: '1600x2560', emulator: 'Nexus_10_API_30' },
  ],
};

const SCREENSHOTS = [
  {
    name: 'dashboard',
    title: 'Real-Time Server Monitoring',
    description: 'Monitor all your servers at a glance',
    screen: 'Dashboard',
    actions: ['navigate_to_dashboard', 'wait_for_data'],
  },
  {
    name: 'alerts',
    title: 'Intelligent Alert System',
    description: 'Stay informed with smart alerts',
    screen: 'Alerts',
    actions: ['navigate_to_alerts', 'show_alert_filters'],
  },
  {
    name: 'voice_response',
    title: 'Voice-Powered Responses',
    description: 'Respond to alerts using voice commands',
    screen: 'Alerts',
    actions: ['navigate_to_alerts', 'open_voice_modal'],
  },
  {
    name: 'analytics',
    title: 'Powerful Analytics',
    description: 'Gain insights with trend analysis',
    screen: 'Analytics',
    actions: ['navigate_to_analytics', 'show_charts'],
  },
  {
    name: 'apple_watch',
    title: 'Apple Watch Companion',
    description: 'Monitor from your wrist',
    screen: 'Watch',
    actions: ['show_watch_interface'],
    platforms: ['ios'],
  },
];

class ScreenshotGenerator {
  constructor() {
    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(SCREENSHOTS_DIR)) {
      fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    }

    // Create platform directories
    ['ios', 'android'].forEach(platform => {
      const platformDir = path.join(SCREENSHOTS_DIR, platform);
      if (!fs.existsSync(platformDir)) {
        fs.mkdirSync(platformDir, { recursive: true });
      }

      // Create device directories
      DEVICES[platform].forEach(device => {
        const deviceDir = path.join(platformDir, device.name.replace(/\s+/g, '_'));
        if (!fs.existsSync(deviceDir)) {
          fs.mkdirSync(deviceDir, { recursive: true });
        }
      });
    });
  }

  async generateiOSScreenshots() {
    console.log('📱 Generating iOS screenshots...');

    for (const device of DEVICES.ios) {
      console.log(`📱 Processing ${device.name}...`);

      try {
        // Boot simulator
        console.log(`🚀 Booting ${device.simulator}...`);
        execSync(`xcrun simctl boot "${device.simulator}"`, { stdio: 'inherit' });

        // Install app
        console.log('📦 Installing app...');
        execSync('npx react-native run-ios --simulator="' + device.simulator + '"', {
          stdio: 'inherit',
          timeout: 120000,
        });

        // Wait for app to load
        await this.sleep(10000);

        // Generate screenshots for each screen
        for (const screenshot of SCREENSHOTS) {
          if (screenshot.platforms && !screenshot.platforms.includes('ios')) {
            continue;
          }

          console.log(`📸 Capturing ${screenshot.name} for ${device.name}...`);

          // Perform actions to navigate to screen
          await this.performActions(screenshot.actions, 'ios');

          // Take screenshot
          const screenshotPath = path.join(
            SCREENSHOTS_DIR,
            'ios',
            device.name.replace(/\s+/g, '_'),
            `${screenshot.name}.png`
          );

          execSync(`xcrun simctl io booted screenshot "${screenshotPath}"`, {
            stdio: 'inherit',
          });

          console.log(`✅ Screenshot saved: ${screenshotPath}`);
        }

        // Shutdown simulator
        execSync(`xcrun simctl shutdown "${device.simulator}"`, { stdio: 'inherit' });

      } catch (error) {
        console.error(`❌ Error generating screenshots for ${device.name}:`, error.message);
      }
    }
  }

  async generateAndroidScreenshots() {
    console.log('🤖 Generating Android screenshots...');

    for (const device of DEVICES.android) {
      console.log(`🤖 Processing ${device.name}...`);

      try {
        // Start emulator
        console.log(`🚀 Starting ${device.emulator}...`);
        execSync(`emulator -avd ${device.emulator} -no-audio -no-window &`, {
          stdio: 'inherit',
        });

        // Wait for emulator to boot
        console.log('⏳ Waiting for emulator to boot...');
        execSync('adb wait-for-device', { stdio: 'inherit' });
        await this.sleep(30000);

        // Install and run app
        console.log('📦 Installing and running app...');
        execSync('npx react-native run-android', {
          stdio: 'inherit',
          timeout: 120000,
        });

        // Wait for app to load
        await this.sleep(10000);

        // Generate screenshots for each screen
        for (const screenshot of SCREENSHOTS) {
          if (screenshot.platforms && !screenshot.platforms.includes('android')) {
            continue;
          }

          console.log(`📸 Capturing ${screenshot.name} for ${device.name}...`);

          // Perform actions to navigate to screen
          await this.performActions(screenshot.actions, 'android');

          // Take screenshot
          const screenshotPath = path.join(
            SCREENSHOTS_DIR,
            'android',
            device.name.replace(/\s+/g, '_'),
            `${screenshot.name}.png`
          );

          execSync(`adb exec-out screencap -p > "${screenshotPath}"`, {
            stdio: 'inherit',
          });

          console.log(`✅ Screenshot saved: ${screenshotPath}`);
        }

        // Stop emulator
        execSync('adb emu kill', { stdio: 'inherit' });

      } catch (error) {
        console.error(`❌ Error generating screenshots for ${device.name}:`, error.message);
      }
    }
  }

  async performActions(actions, platform) {
    for (const action of actions) {
      console.log(`🎬 Performing action: ${action}`);

      switch (action) {
        case 'navigate_to_dashboard':
          await this.navigateToScreen('Dashboard', platform);
          break;
        case 'navigate_to_alerts':
          await this.navigateToScreen('Alerts', platform);
          break;
        case 'navigate_to_analytics':
          await this.navigateToScreen('Analytics', platform);
          break;
        case 'wait_for_data':
          await this.sleep(3000);
          break;
        case 'show_alert_filters':
          await this.tapElement('filter-button', platform);
          break;
        case 'open_voice_modal':
          await this.tapElement('voice-button', platform);
          break;
        case 'show_charts':
          await this.sleep(2000);
          break;
        case 'show_watch_interface':
          // This would require special handling for watch screenshots
          break;
        default:
          console.log(`⚠️ Unknown action: ${action}`);
      }

      await this.sleep(1000);
    }
  }

  async navigateToScreen(screenName, platform) {
    // This would use Detox or similar automation framework
    // For now, we'll simulate with delays
    console.log(`🧭 Navigating to ${screenName} screen`);
    await this.sleep(2000);
  }

  async tapElement(elementId, platform) {
    // This would use Detox or similar automation framework
    console.log(`👆 Tapping element: ${elementId}`);
    await this.sleep(1000);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  generateMarketing() {
    console.log('🎨 Generating marketing materials...');

    const marketingDir = path.join(SCREENSHOTS_DIR, 'marketing');
    if (!fs.existsSync(marketingDir)) {
      fs.mkdirSync(marketingDir, { recursive: true });
    }

    // Generate screenshot descriptions
    const descriptions = SCREENSHOTS.map(screenshot => ({
      filename: screenshot.name,
      title: screenshot.title,
      description: screenshot.description,
      platforms: screenshot.platforms || ['ios', 'android'],
    }));

    fs.writeFileSync(
      path.join(marketingDir, 'screenshot-descriptions.json'),
      JSON.stringify(descriptions, null, 2)
    );

    console.log('✅ Marketing materials generated');
  }

  async generateAll() {
    console.log('🚀 Starting screenshot generation process...');

    try {
      await this.generateiOSScreenshots();
      await this.generateAndroidScreenshots();
      this.generateMarketing();

      console.log('🎉 Screenshot generation complete!');
      console.log(`📁 Screenshots saved to: ${SCREENSHOTS_DIR}`);

    } catch (error) {
      console.error('❌ Screenshot generation failed:', error);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const generator = new ScreenshotGenerator();
  generator.generateAll().catch(console.error);
}

module.exports = ScreenshotGenerator;
