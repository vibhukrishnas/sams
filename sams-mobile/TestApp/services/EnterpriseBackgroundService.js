/**
 * 🔥 ENTERPRISE BACKGROUND SERVICE - REAL-TIME MONITORING
 * Handles critical background operations, monitoring, and sync
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Alert, Platform } from 'react-native';
import BackgroundJob from 'react-native-background-job';
import BackgroundTimer from 'react-native-background-timer';
import NetInfo from '@react-native-community/netinfo';
import webSocketService from './api/WebSocketService';
import pushNotificationService from './PushNotificationService';
import infraService from './InfraService';

class EnterpriseBackgroundService {
  constructor() {
    this.isRunning = false;
    this.backgroundTasks = new Map();
    this.appState = AppState.currentState;
    this.monitoringInterval = null;
    this.syncInterval = null;
    this.healthCheckInterval = null;
    this.lastSyncTime = null;
    this.isNetworkConnected = true;
    this.criticalAlerts = [];
    this.backgroundJobId = null;
    this.offlineQueue = [];
    this.retryAttempts = 0;
    this.maxRetryAttempts = 5;
    
    this.setupAppStateListener();
    this.setupNetworkListener();
    console.log('🔥 EnterpriseBackgroundService initialized - enterprise-grade background operations ready');
  }

  /**
   * Setup app state listener
   */
  setupAppStateListener() {
    AppState.addEventListener('change', this.handleAppStateChange.bind(this));
  }

  /**
   * Setup network connectivity listener
   */
  setupNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasConnected = this.isNetworkConnected;
      this.isNetworkConnected = state.isConnected;
      
      if (!wasConnected && this.isNetworkConnected) {
        console.log('🔥 EnterpriseBackgroundService: Network reconnected, processing offline queue');
        this.processOfflineQueue();
        this.reconnectServices();
      } else if (wasConnected && !this.isNetworkConnected) {
        console.log('🔥 EnterpriseBackgroundService: Network disconnected, entering offline mode');
        this.handleNetworkDisconnection();
      }
    });
  }

  /**
   * Handle app state changes
   */
  handleAppStateChange(nextAppState) {
    console.log('🔥 EnterpriseBackgroundService: App state changed from', this.appState, 'to', nextAppState);
    
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
  async handleAppForeground() {
    console.log('🔥 EnterpriseBackgroundService: App in foreground');
    
    // Stop background job
    this.stopBackgroundJob();
    
    // Reconnect WebSocket if needed
    if (!webSocketService.isConnected) {
      await webSocketService.connect();
    }
    
    // Sync latest data
    await this.syncLatestData();
    
    // Clear badge count
    pushNotificationService.clearBadgeCount();
    
    // Process pending notifications
    await this.processPendingNotifications();
  }

  /**
   * Handle app going to background
   */
  async handleAppBackground() {
    console.log('🔥 EnterpriseBackgroundService: App in background');
    
    // Start background job
    this.startBackgroundJob();
    
    // Start background monitoring
    this.startBackgroundMonitoring();
    
    // Save current state
    await this.saveCurrentState();
  }

  /**
   * Start background job
   */
  startBackgroundJob() {
    if (Platform.OS === 'ios') {
      // iOS background processing
      this.backgroundJobId = BackgroundJob.start({
        jobKey: 'samsMonitoring',
        period: 15000, // 15 seconds
      });
      
      BackgroundJob.register({
        jobKey: 'samsMonitoring',
        job: () => {
          this.performBackgroundTasks();
        }
      });
    } else {
      // Android background processing
      this.startAndroidBackgroundTasks();
    }
  }

  /**
   * Start Android background tasks
   */
  startAndroidBackgroundTasks() {
    this.backgroundJobId = BackgroundTimer.setInterval(() => {
      this.performBackgroundTasks();
    }, 15000); // 15 seconds
  }

  /**
   * Stop background job
   */
  stopBackgroundJob() {
    if (this.backgroundJobId) {
      if (Platform.OS === 'ios') {
        BackgroundJob.stop();
      } else {
        BackgroundTimer.clearInterval(this.backgroundJobId);
      }
      this.backgroundJobId = null;
    }
  }

  /**
   * Perform background tasks
   */
  async performBackgroundTasks() {
    try {
      console.log('🔥 EnterpriseBackgroundService: Performing background tasks');
      
      // Check network connectivity
      const networkState = await NetInfo.fetch();
      this.isNetworkConnected = networkState.isConnected;
      
      if (this.isNetworkConnected) {
        // Perform online tasks
        await this.checkCriticalAlerts();
        await this.syncCriticalData();
        await this.performHealthChecks();
      } else {
        // Perform offline tasks
        await this.handleOfflineMode();
      }
      
      // Update last activity timestamp
      await AsyncStorage.setItem('lastBackgroundActivity', new Date().toISOString());
      
    } catch (error) {
      console.error('EnterpriseBackgroundService: Background task error', error);
    }
  }

  /**
   * Check for critical alerts
   */
  async checkCriticalAlerts() {
    try {
      const alerts = infraService.getUnacknowledgedAlerts();
      const criticalAlerts = alerts.filter(alert => 
        alert.severity === 'critical' || alert.severity === 'high'
      );
      
      // Check for new critical alerts
      const newCriticalAlerts = criticalAlerts.filter(alert => 
        !this.criticalAlerts.some(existing => existing.id === alert.id)
      );
      
      if (newCriticalAlerts.length > 0) {
        console.log('🚨 EnterpriseBackgroundService: New critical alerts detected', newCriticalAlerts.length);
        
        // Send push notifications for critical alerts
        for (const alert of newCriticalAlerts) {
          await this.sendCriticalAlertNotification(alert);
        }
        
        // Update critical alerts cache
        this.criticalAlerts = criticalAlerts;
      }
    } catch (error) {
      console.error('EnterpriseBackgroundService: Critical alerts check error', error);
    }
  }

  /**
   * Send critical alert notification
   */
  async sendCriticalAlertNotification(alert) {
    pushNotificationService.showLocalNotification({
      title: `🚨 CRITICAL: ${alert.title}`,
      message: alert.message,
      data: {
        alertId: alert.id,
        serverId: alert.serverId,
        severity: alert.severity,
        type: 'critical_alert',
      },
      priority: 'critical',
    });
    
    // Update badge count
    pushNotificationService.updateBadgeCount(1);
  }

  /**
   * Sync critical data
   */
  async syncCriticalData() {
    try {
      // Sync server status
      await this.syncServerStatus();
      
      // Sync recent alerts
      await this.syncRecentAlerts();
      
      // Update last sync time
      this.lastSyncTime = new Date().toISOString();
      await AsyncStorage.setItem('lastSyncTime', this.lastSyncTime);
      
    } catch (error) {
      console.error('EnterpriseBackgroundService: Critical data sync error', error);
      this.addToOfflineQueue('syncCriticalData', {});
    }
  }

  /**
   * Sync server status
   */
  async syncServerStatus() {
    const servers = infraService.getServers();
    const offlineServers = servers.filter(server => server.status === 'offline');
    
    if (offlineServers.length > 0) {
      console.log('🔥 EnterpriseBackgroundService: Offline servers detected', offlineServers.length);
      
      // Send notification for offline servers
      pushNotificationService.showLocalNotification({
        title: `⚠️ ${offlineServers.length} Server(s) Offline`,
        message: `${offlineServers.map(s => s.name).join(', ')} are currently offline`,
        data: {
          type: 'server_offline',
          serverIds: offlineServers.map(s => s.id),
        },
        priority: 'high',
      });
    }
  }

  /**
   * Sync recent alerts
   */
  async syncRecentAlerts() {
    // This would typically fetch from backend
    // For now, we'll use local data
    const alerts = infraService.getAlerts();
    const recentAlerts = alerts.filter(alert => {
      const alertTime = new Date(alert.timestamp);
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      return alertTime > fiveMinutesAgo;
    });
    
    if (recentAlerts.length > 0) {
      console.log('🔥 EnterpriseBackgroundService: Recent alerts found', recentAlerts.length);
    }
  }

  /**
   * Perform health checks
   */
  async performHealthChecks() {
    try {
      // Trigger health checks
      await infraService.performHealthChecks();
      
      // Check system health
      const healthSummary = infraService.getHealthSummary();
      
      if (healthSummary.healthScore < 80) {
        console.log('🔥 EnterpriseBackgroundService: System health degraded', healthSummary.healthScore);
        
        pushNotificationService.showLocalNotification({
          title: '⚠️ System Health Alert',
          message: `System health score: ${healthSummary.healthScore}%`,
          data: {
            type: 'health_alert',
            healthScore: healthSummary.healthScore,
          },
          priority: 'medium',
        });
      }
    } catch (error) {
      console.error('EnterpriseBackgroundService: Health checks error', error);
    }
  }

  /**
   * Handle offline mode
   */
  async handleOfflineMode() {
    console.log('🔥 EnterpriseBackgroundService: Operating in offline mode');
    
    // Use cached data
    const cachedData = await this.getCachedData();
    
    // Check for critical cached alerts
    if (cachedData.criticalAlerts && cachedData.criticalAlerts.length > 0) {
      pushNotificationService.showLocalNotification({
        title: '📱 Offline Mode',
        message: 'Operating with cached data. Some features may be limited.',
        priority: 'low',
      });
    }
  }

  /**
   * Handle network disconnection
   */
  handleNetworkDisconnection() {
    console.log('🔥 EnterpriseBackgroundService: Network disconnected');
    
    // Disconnect WebSocket gracefully
    webSocketService.disconnect();
    
    // Show offline notification
    pushNotificationService.showLocalNotification({
      title: '📡 Network Disconnected',
      message: 'SAMS is now operating in offline mode',
      priority: 'medium',
    });
  }

  /**
   * Reconnect services after network restoration
   */
  async reconnectServices() {
    console.log('🔥 EnterpriseBackgroundService: Reconnecting services');
    
    // Reconnect WebSocket
    await webSocketService.connect();
    
    // Sync data
    await this.syncLatestData();
    
    // Show reconnection notification
    pushNotificationService.showLocalNotification({
      title: '📡 Network Restored',
      message: 'SAMS is back online and syncing data',
      priority: 'low',
    });
  }

  /**
   * Add task to offline queue
   */
  addToOfflineQueue(taskType, data) {
    this.offlineQueue.push({
      taskType,
      data,
      timestamp: new Date().toISOString(),
    });
    
    // Limit queue size
    if (this.offlineQueue.length > 100) {
      this.offlineQueue = this.offlineQueue.slice(-100);
    }
  }

  /**
   * Process offline queue
   */
  async processOfflineQueue() {
    console.log('🔥 EnterpriseBackgroundService: Processing offline queue', this.offlineQueue.length, 'items');
    
    while (this.offlineQueue.length > 0 && this.isNetworkConnected) {
      const task = this.offlineQueue.shift();
      
      try {
        await this.executeOfflineTask(task);
      } catch (error) {
        console.error('EnterpriseBackgroundService: Offline task execution error', error);
        
        // Re-add to queue if retry attempts available
        if (this.retryAttempts < this.maxRetryAttempts) {
          this.offlineQueue.unshift(task);
          this.retryAttempts++;
        }
      }
    }
    
    this.retryAttempts = 0;
  }

  /**
   * Execute offline task
   */
  async executeOfflineTask(task) {
    switch (task.taskType) {
      case 'syncCriticalData':
        await this.syncCriticalData();
        break;
      case 'acknowledgeAlert':
        await this.acknowledgeAlert(task.data.alertId);
        break;
      case 'updateServerStatus':
        await this.updateServerStatus(task.data.serverId, task.data.status);
        break;
      default:
        console.log('EnterpriseBackgroundService: Unknown offline task type', task.taskType);
    }
  }

  /**
   * Sync latest data
   */
  async syncLatestData() {
    try {
      console.log('🔥 EnterpriseBackgroundService: Syncing latest data');
      
      // Initialize infrastructure service
      await infraService.initialize();
      
      // Update last sync time
      this.lastSyncTime = new Date().toISOString();
      await AsyncStorage.setItem('lastSyncTime', this.lastSyncTime);
      
    } catch (error) {
      console.error('EnterpriseBackgroundService: Latest data sync error', error);
    }
  }

  /**
   * Process pending notifications
   */
  async processPendingNotifications() {
    const pendingNotifications = await pushNotificationService.getPendingNotifications();
    
    if (pendingNotifications.length > 0) {
      console.log('🔥 EnterpriseBackgroundService: Processing pending notifications', pendingNotifications.length);
      
      // Clear pending notifications
      await pushNotificationService.clearPendingNotifications();
    }
  }

  /**
   * Save current state
   */
  async saveCurrentState() {
    try {
      const state = {
        lastActivity: new Date().toISOString(),
        appState: this.appState,
        isNetworkConnected: this.isNetworkConnected,
        criticalAlertsCount: this.criticalAlerts.length,
      };
      
      await AsyncStorage.setItem('enterpriseBackgroundServiceState', JSON.stringify(state));
    } catch (error) {
      console.error('EnterpriseBackgroundService: Save state error', error);
    }
  }

  /**
   * Get cached data
   */
  async getCachedData() {
    try {
      const cached = await AsyncStorage.getItem('cachedData');
      return cached ? JSON.parse(cached) : {};
    } catch (error) {
      console.error('EnterpriseBackgroundService: Get cached data error', error);
      return {};
    }
  }

  /**
   * Start background monitoring
   */
  startBackgroundMonitoring() {
    if (!this.monitoringInterval) {
      this.monitoringInterval = setInterval(() => {
        this.performBackgroundTasks();
      }, 30000); // 30 seconds
    }
  }

  /**
   * Stop background monitoring
   */
  stopBackgroundMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Start service
   */
  async start() {
    if (this.isRunning) return;
    
    console.log('🔥 EnterpriseBackgroundService: Starting service');
    this.isRunning = true;
    
    // Initialize push notifications
    await pushNotificationService.initialize();
    
    // Connect WebSocket
    await webSocketService.connect();
    
    // Start monitoring based on app state
    if (this.appState === 'background') {
      this.startBackgroundJob();
    }
  }

  /**
   * Stop service
   */
  stop() {
    if (!this.isRunning) return;
    
    console.log('🔥 EnterpriseBackgroundService: Stopping service');
    this.isRunning = false;
    
    this.stopBackgroundJob();
    this.stopBackgroundMonitoring();
    webSocketService.disconnect();
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      appState: this.appState,
      isNetworkConnected: this.isNetworkConnected,
      lastSyncTime: this.lastSyncTime,
      criticalAlertsCount: this.criticalAlerts.length,
      offlineQueueSize: this.offlineQueue.length,
    };
  }
}

export default new EnterpriseBackgroundService();
