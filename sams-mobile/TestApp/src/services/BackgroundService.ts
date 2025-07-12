/**
 * 🔄 Background Service - Core Background Processing
 * Handles background sync, monitoring, and task management
 */

import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import BackgroundJob from 'react-native-background-job';
import BackgroundTimer from 'react-native-background-timer';

class BackgroundService {
  private static instance: BackgroundService;
  private isRunning = false;
  private appState: AppStateStatus = AppState.currentState;
  private syncInterval: NodeJS.Timeout | null = null;
  private backgroundJobId: string | null = null;
  private isNetworkConnected = true;
  private lastSyncTime: Date | null = null;

  constructor() {
    this.setupAppStateListener();
    this.setupNetworkListener();
    console.log('🔄 BackgroundService initialized');
  }

  static getInstance(): BackgroundService {
    if (!BackgroundService.instance) {
      BackgroundService.instance = new BackgroundService();
    }
    return BackgroundService.instance;
  }

  /**
   * Setup app state change listener
   */
  private setupAppStateListener() {
    AppState.addEventListener('change', this.handleAppStateChange.bind(this));
  }

  /**
   * Setup network state listener
   */
  private setupNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasConnected = this.isNetworkConnected;
      this.isNetworkConnected = state.isConnected ?? false;
      
      if (!wasConnected && this.isNetworkConnected) {
        // Network restored
        this.handleNetworkRestore();
      } else if (wasConnected && !this.isNetworkConnected) {
        // Network lost
        this.handleNetworkLoss();
      }
    });
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange(nextAppState: AppStateStatus) {
    console.log('🔄 App state changed:', this.appState, '->', nextAppState);
    
    if (this.appState.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground
      this.handleAppForeground();
    } else if (this.appState === 'active' && nextAppState.match(/inactive|background/)) {
      // App went to background
      this.handleAppBackground();
    }
    
    this.appState = nextAppState;
  }

  /**
   * Handle app coming to foreground
   */
  private async handleAppForeground() {
    console.log('🔄 App in foreground - stopping background tasks');
    
    // Stop background processing
    this.stopBackgroundTasks();
    
    // Sync latest data
    await this.syncData();
  }

  /**
   * Handle app going to background
   */
  private async handleAppBackground() {
    console.log('🔄 App in background - starting background tasks');
    
    // Start background processing
    this.startBackgroundTasks();
    
    // Save current state
    await this.saveAppState();
  }

  /**
   * Handle network restoration
   */
  private async handleNetworkRestore() {
    console.log('🔄 Network restored - syncing data');
    await this.syncData();
  }

  /**
   * Handle network loss
   */
  private handleNetworkLoss() {
    console.log('🔄 Network lost - switching to offline mode');
    // Handle offline mode logic here
  }

  /**
   * Start background tasks
   */
  private startBackgroundTasks() {
    if (this.syncInterval) return;

    // Start periodic sync (every 30 seconds)
    this.syncInterval = BackgroundTimer.setInterval(() => {
      this.performBackgroundSync();
    }, 30000);

    // Register background job for iOS
    this.backgroundJobId = BackgroundJob.start({
      jobKey: 'samsBackgroundSync',
      period: 30000,
    });

    BackgroundJob.register({
      jobKey: 'samsBackgroundSync',
      job: () => {
        this.performBackgroundSync();
      }
    });
  }

  /**
   * Stop background tasks
   */
  private stopBackgroundTasks() {
    if (this.syncInterval) {
      BackgroundTimer.clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    if (this.backgroundJobId) {
      BackgroundJob.stop(this.backgroundJobId);
      this.backgroundJobId = null;
    }
  }

  /**
   * Perform background sync
   */
  private async performBackgroundSync() {
    if (!this.isNetworkConnected) return;

    try {
      console.log('🔄 Performing background sync');
      
      // Sync critical data
      await this.syncCriticalData();
      
      // Update last sync time
      this.lastSyncTime = new Date();
      await AsyncStorage.setItem('lastBackgroundSync', this.lastSyncTime.toISOString());
      
    } catch (error) {
      console.error('🔄 Background sync error:', error);
    }
  }

  /**
   * Sync critical data
   */
  private async syncCriticalData() {
    // This would typically sync with your API
    // For now, we'll just simulate the sync
    console.log('🔄 Syncing critical data...');
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('🔄 Critical data synced');
  }

  /**
   * Sync all data
   */
  private async syncData() {
    if (!this.isNetworkConnected) {
      console.log('🔄 No network - skipping sync');
      return;
    }

    try {
      console.log('🔄 Syncing all data');
      
      // Sync servers, alerts, metrics, etc.
      await this.syncCriticalData();
      
      // Update last sync time
      this.lastSyncTime = new Date();
      await AsyncStorage.setItem('lastSync', this.lastSyncTime.toISOString());
      
    } catch (error) {
      console.error('🔄 Data sync error:', error);
    }
  }

  /**
   * Save app state
   */
  private async saveAppState() {
    try {
      const appState = {
        lastActiveTime: new Date().toISOString(),
        appState: this.appState,
        isNetworkConnected: this.isNetworkConnected,
      };
      
      await AsyncStorage.setItem('appState', JSON.stringify(appState));
    } catch (error) {
      console.error('🔄 Error saving app state:', error);
    }
  }

  /**
   * Get last sync time
   */
  public getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }

  /**
   * Get network status
   */
  public isConnected(): boolean {
    return this.isNetworkConnected;
  }

  /**
   * Force sync
   */
  public async forceSync(): Promise<void> {
    await this.syncData();
  }

  /**
   * Start the background service
   */
  public async start(): Promise<void> {
    if (this.isRunning) return;

    console.log('🔄 Starting BackgroundService');
    this.isRunning = true;

    // Get initial network state
    const networkState = await NetInfo.fetch();
    this.isNetworkConnected = networkState.isConnected ?? false;

    // Load last sync time
    try {
      const lastSync = await AsyncStorage.getItem('lastSync');
      if (lastSync) {
        this.lastSyncTime = new Date(lastSync);
      }
    } catch (error) {
      console.error('🔄 Error loading last sync time:', error);
    }

    // Start background tasks if app is in background
    if (this.appState.match(/inactive|background/)) {
      this.startBackgroundTasks();
    }

    // Initial sync
    await this.syncData();
  }

  /**
   * Stop the background service
   */
  public stop(): void {
    if (!this.isRunning) return;

    console.log('🔄 Stopping BackgroundService');
    this.isRunning = false;

    this.stopBackgroundTasks();
  }

  /**
   * Check if service is running
   */
  public isServiceRunning(): boolean {
    return this.isRunning;
  }
}

// Export singleton instance
export default new BackgroundService();
