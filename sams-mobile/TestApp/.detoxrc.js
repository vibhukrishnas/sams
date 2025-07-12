/**
 * Detox Configuration
 * End-to-end testing configuration for React Native
 * Updated for comprehensive mobile testing automation
 */

module.exports = {
  testRunner: {
    args: {
      '$0': 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupFilesAfterEnv: ['<rootDir>/e2e/setup.js'],
      testTimeout: 120000,
      maxWorkers: 1,
      verbose: true,
    },
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/TestApp.app',
      build: 'xcodebuild -workspace ios/TestApp.xcworkspace -scheme TestApp -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build -quiet',
    },
    'ios.release': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Release-iphonesimulator/TestApp.app',
      build: 'xcodebuild -workspace ios/TestApp.xcworkspace -scheme TestApp -configuration Release -sdk iphonesimulator -derivedDataPath ios/build -quiet',
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug --quiet',
      reversePorts: [8081, 8080],
    },
    'android.release': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/release/app-release.apk',
      build: 'cd android && ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release --quiet',
      reversePorts: [8081, 8080],
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 14 Pro',
        os: 'iOS 16.0',
      },
    },
    'simulator.iphone12': {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 12',
        os: 'iOS 15.0',
      },
    },
    'simulator.ipad': {
      type: 'ios.simulator',
      device: {
        type: 'iPad Pro (12.9-inch) (5th generation)',
        os: 'iOS 16.0',
      },
    },
    attached: {
      type: 'android.attached',
      device: {
        adbName: '.*',
      },
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_4_API_30',
      },
    },
    'emulator.pixel6': {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_6_API_31',
      },
    },
    'emulator.tablet': {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_C_API_30',
      },
    },
    genymotion: {
      type: 'android.genycloud',
      device: {
        recipeUUID: 'your-genymotion-recipe-uuid',
      },
    },
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug',
    },
    'ios.sim.release': {
      device: 'simulator',
      app: 'ios.release',
    },
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug',
    },
    'android.emu.release': {
      device: 'emulator',
      app: 'android.release',
    },
    'android.attached.debug': {
      device: 'attached',
      app: 'android.debug',
    },
    'android.attached.release': {
      device: 'attached',
      app: 'android.release',
    },
    'ios.iphone12.debug': {
      device: 'simulator.iphone12',
      app: 'ios.debug',
    },
    'ios.ipad.debug': {
      device: 'simulator.ipad',
      app: 'ios.debug',
    },
    'android.pixel6.debug': {
      device: 'emulator.pixel6',
      app: 'android.debug',
    },
    'android.tablet.debug': {
      device: 'emulator.tablet',
      app: 'android.debug',
    },
    'android.geny.debug': {
      device: 'genymotion',
      app: 'android.debug',
    },
  },
  behavior: {
    init: {
      reinstallApp: true,
      exposeGlobals: false,
    },
    launchApp: 'auto',
    cleanup: {
      shutdownDevice: false,
    },
  },
  artifacts: {
    rootDir: './e2e/artifacts',
    pathBuilder: './e2e/pathBuilder.js',
    plugins: {
      log: {
        enabled: true,
        keepOnlyFailedTestsArtifacts: false,
      },
      screenshot: {
        enabled: true,
        shouldTakeAutomaticSnapshots: true,
        keepOnlyFailedTestsArtifacts: false,
        takeWhen: {
          testStart: false,
          testDone: true,
          testFailure: true,
        },
      },
      video: {
        enabled: true,
        keepOnlyFailedTestsArtifacts: false,
        android: {
          bitRate: 4000000,
        },
        simulator: {
          codec: 'hevc',
        },
      },
      instruments: {
        enabled: process.env.CI ? false : true,
      },
      timeline: {
        enabled: true,
      },
      uiHierarchy: {
        enabled: true,
        keepOnlyFailedTestsArtifacts: false,
      },
    },
  },
  logger: {
    level: process.env.CI ? 'debug' : 'info',
    overrideConsole: true,
    options: {
      showLoggerName: true,
      showPid: true,
      showLevel: false,
      showMetadata: false,
      basepath: __dirname,
      showPrefix: true,
      showTimestamp: true,
    },
  },
  session: {
    autoStart: true,
    debugSynchronization: 10000,
  },
};
