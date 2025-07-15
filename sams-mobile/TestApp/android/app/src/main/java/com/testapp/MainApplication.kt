package com.testapp

import android.app.Application
import android.util.Log
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.soloader.SoLoader
import java.util.concurrent.Executors
import java.util.concurrent.ThreadPoolExecutor

class MainApplication : Application(), ReactApplication {

  companion object {
    private const val TAG = "MainApplication"

    // Custom thread pool executor to handle background tasks
    private val backgroundExecutor: ThreadPoolExecutor by lazy {
      Executors.newFixedThreadPool(4) as ThreadPoolExecutor
    }
  }

  override fun getReactNativeHost(): ReactNativeHost = reactNativeHost

  private val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            try {
              PackageList(this).packages.apply {
                // Packages that cannot be autolinked yet can be added manually here, for example:
                // add(MyReactNativePackage())
              }
            } catch (e: Exception) {
              Log.e(TAG, "Error loading packages", e)
              emptyList()
            }

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = try {
          BuildConfig.DEBUG
        } catch (e: Exception) {
          Log.e(TAG, "Error getting developer support flag", e)
          false
        }

        override val isNewArchEnabled: Boolean = try {
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        } catch (e: Exception) {
          Log.e(TAG, "Error getting new architecture flag", e)
          false
        }

        override val isHermesEnabled: Boolean = try {
          BuildConfig.IS_HERMES_ENABLED
        } catch (e: Exception) {
          Log.e(TAG, "Error getting Hermes flag", e)
          true // Default to Hermes enabled
        }
      }

  override fun onCreate() {
    try {
      super.onCreate()

      // Initialize custom thread pool manager
      try {
        ThreadPoolManager.getInstance()
        Log.d(TAG, "ThreadPoolManager initialized successfully")
      } catch (e: Exception) {
        Log.e(TAG, "Error initializing ThreadPoolManager", e)
      }

      // Initialize custom network manager
      try {
        NetworkManager.getInstance()
        Log.d(TAG, "NetworkManager initialized successfully")
      } catch (e: Exception) {
        Log.e(TAG, "Error initializing NetworkManager", e)
      }

      // Initialize SoLoader with error handling
      try {
        SoLoader.init(this, false)
        Log.d(TAG, "SoLoader initialized successfully")
      } catch (e: Exception) {
        Log.e(TAG, "Error initializing SoLoader", e)
        // Try alternative initialization
        try {
          SoLoader.init(this, true)
        } catch (e2: Exception) {
          Log.e(TAG, "Failed to initialize SoLoader with fallback", e2)
        }
      }

      // Initialize background executor
      backgroundExecutor.prestartAllCoreThreads()
      Log.d(TAG, "Background executor initialized")

    } catch (e: Exception) {
      Log.e(TAG, "Error in onCreate", e)
    }
  }

  override fun onTerminate() {
    try {
      // Clean up custom managers
      try {
        ThreadPoolManager.getInstance().shutdown()
        Log.d(TAG, "ThreadPoolManager shutdown completed")
      } catch (e: Exception) {
        Log.e(TAG, "Error shutting down ThreadPoolManager", e)
      }

      try {
        NetworkManager.getInstance().shutdown()
        Log.d(TAG, "NetworkManager shutdown completed")
      } catch (e: Exception) {
        Log.e(TAG, "Error shutting down NetworkManager", e)
      }

      // Clean up background executor
      backgroundExecutor.shutdown()
      super.onTerminate()
    } catch (e: Exception) {
      Log.e(TAG, "Error in onTerminate", e)
    }
  }
}
