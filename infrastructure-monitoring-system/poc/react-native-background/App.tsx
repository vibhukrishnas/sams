/**
 * 📱 React Native Background Processing - POC Implementation
 * Demonstrates background monitoring and push notifications
 */

import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Alert,
  Switch,
  TouchableOpacity,
  Platform,
} from 'react-native';
import BackgroundJob from 'react-native-background-job';
import PushNotification from 'react-native-push-notification';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface MetricData {
  timestamp: string;
  cpu: number;
  memory: number;
  network: boolean;
  alerts: number;
}

interface AppState {
  backgroundEnabled: boolean;
  networkStatus: boolean;
  lastUpdate: string;
  metrics: MetricData[];
  alertsCount: number;
  isMonitoring: boolean;
}

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    backgroundEnabled: false,
    networkStatus: true,
    lastUpdate: 'Never',
    metrics: [],
    alertsCount: 0,
    isMonitoring: false,
  });

  useEffect(() => {
    initializeApp();
    setupNetworkListener();
    setupPushNotifications();
    
    return () => {
      stopBackgroundMonitoring();
    };
  }, []);

  /**
   * Initialize the application
   */
  const initializeApp = async () => {
    console.log('🚀 Initializing React Native Background Processing POC...');
    
    try {
      // Load saved state
      const savedState = await AsyncStorage.getItem('monitoringState');
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        setState(prevState => ({ ...prevState, ...parsedState }));
      }
      
      // Check if background monitoring was previously enabled
      const backgroundEnabled = await AsyncStorage.getItem('backgroundEnabled');
      if (backgroundEnabled === 'true') {
        startBackgroundMonitoring();
      }
      
    } catch (error) {
      console.error('❌ Error initializing app:', error);
    }
  };

  /**
   * Setup network connectivity listener
   */
  const setupNetworkListener = () => {
    const unsubscribe = NetInfo.addEventListener(networkState => {
      console.log('🌐 Network state changed:', networkState);
      
      setState(prevState => ({
        ...prevState,
        networkStatus: networkState.isConnected ?? false,
      }));
      
      if (networkState.isConnected) {
        console.log('✅ Network connected - syncing data...');
        syncDataWithServer();
      } else {
        console.log('❌ Network disconnected - switching to offline mode...');
        showNotification('Network Disconnected', 'Monitoring continues in offline mode');
      }
    });
    
    return unsubscribe;
  };

  /**
   * Setup push notifications
   */
  const setupPushNotifications = () => {
    PushNotification.configure({
      onRegister: function(token) {
        console.log('📱 Push notification token:', token);
      },
      
      onNotification: function(notification) {
        console.log('📨 Notification received:', notification);
        
        if (notification.userInteraction) {
          // User tapped on notification
          handleNotificationTap(notification);
        }
      },
      
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      
      popInitialNotification: true,
      requestPermissions: Platform.OS === 'ios',
    });
    
    // Create notification channel for Android
    if (Platform.OS === 'android') {
      PushNotification.createChannel(
        {
          channelId: 'monitoring-alerts',
          channelName: 'Monitoring Alerts',
          channelDescription: 'Critical monitoring alerts',
          importance: 4,
          vibrate: true,
        },
        (created) => console.log(`📱 Notification channel created: ${created}`)
      );
    }
  };

  /**
   * Start background monitoring
   */
  const startBackgroundMonitoring = () => {
    console.log('🔄 Starting background monitoring...');
    
    BackgroundJob.start({
      jobKey: 'monitoringJob',
      period: 30000, // 30 seconds
    });
    
    // Define the background task
    BackgroundJob.register({
      jobKey: 'monitoringJob',
      job: () => {
        console.log('📊 Background monitoring task executing...');
        performBackgroundMonitoring();
      }
    });
    
    setState(prevState => ({
      ...prevState,
      backgroundEnabled: true,
      isMonitoring: true,
    }));
    
    AsyncStorage.setItem('backgroundEnabled', 'true');
    showNotification('Background Monitoring Started', 'Monitoring is now active');
  };

  /**
   * Stop background monitoring
   */
  const stopBackgroundMonitoring = () => {
    console.log('⏹️ Stopping background monitoring...');
    
    BackgroundJob.stop({
      jobKey: 'monitoringJob',
    });
    
    setState(prevState => ({
      ...prevState,
      backgroundEnabled: false,
      isMonitoring: false,
    }));
    
    AsyncStorage.setItem('backgroundEnabled', 'false');
    showNotification('Background Monitoring Stopped', 'Monitoring has been disabled');
  };

  /**
   * Perform background monitoring tasks
   */
  const performBackgroundMonitoring = async () => {
    try {
      console.log('🔍 Performing background monitoring check...');
      
      // Simulate fetching metrics
      const metrics = await fetchMetrics();
      
      // Check for critical alerts
      const criticalAlerts = checkForCriticalAlerts(metrics);
      
      // Update state
      setState(prevState => ({
        ...prevState,
        metrics: [...prevState.metrics.slice(-9), metrics], // Keep last 10 entries
        lastUpdate: new Date().toLocaleTimeString(),
        alertsCount: prevState.alertsCount + criticalAlerts.length,
      }));
      
      // Send notifications for critical alerts
      criticalAlerts.forEach(alert => {
        sendCriticalAlert(alert);
      });
      
      // Save state
      await saveStateToStorage();
      
    } catch (error) {
      console.error('❌ Error in background monitoring:', error);
    }
  };

  /**
   * Simulate fetching metrics from server
   */
  const fetchMetrics = async (): Promise<MetricData> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate random metrics for POC
    const metrics: MetricData = {
      timestamp: new Date().toISOString(),
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      network: state.networkStatus,
      alerts: Math.floor(Math.random() * 5),
    };
    
    console.log('📊 Fetched metrics:', metrics);
    return metrics;
  };

  /**
   * Check for critical alerts in metrics
   */
  const checkForCriticalAlerts = (metrics: MetricData): string[] => {
    const alerts: string[] = [];
    
    if (metrics.cpu > 90) {
      alerts.push(`High CPU usage: ${metrics.cpu.toFixed(1)}%`);
    }
    
    if (metrics.memory > 85) {
      alerts.push(`High memory usage: ${metrics.memory.toFixed(1)}%`);
    }
    
    if (!metrics.network) {
      alerts.push('Network connectivity lost');
    }
    
    return alerts;
  };

  /**
   * Send critical alert notification
   */
  const sendCriticalAlert = (alertMessage: string) => {
    console.log('🚨 Sending critical alert:', alertMessage);
    
    PushNotification.localNotification({
      channelId: 'monitoring-alerts',
      title: '🚨 Critical Alert',
      message: alertMessage,
      playSound: true,
      soundName: 'default',
      importance: 'high',
      priority: 'high',
      vibrate: true,
      vibration: 300,
      actions: ['View', 'Dismiss'],
    });
  };

  /**
   * Show general notification
   */
  const showNotification = (title: string, message: string) => {
    PushNotification.localNotification({
      channelId: 'monitoring-alerts',
      title,
      message,
      playSound: false,
      importance: 'default',
      priority: 'default',
    });
  };

  /**
   * Handle notification tap
   */
  const handleNotificationTap = (notification: any) => {
    console.log('👆 Notification tapped:', notification);
    
    Alert.alert(
      'Notification Tapped',
      `You tapped on: ${notification.title}`,
      [{ text: 'OK' }]
    );
  };

  /**
   * Sync data with server
   */
  const syncDataWithServer = async () => {
    try {
      console.log('🔄 Syncing data with server...');
      
      // In real implementation, this would sync with actual server
      // For POC, we'll just simulate the sync
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('✅ Data sync completed');
      
    } catch (error) {
      console.error('❌ Error syncing data:', error);
    }
  };

  /**
   * Save state to local storage
   */
  const saveStateToStorage = async () => {
    try {
      const stateToSave = {
        lastUpdate: state.lastUpdate,
        alertsCount: state.alertsCount,
        metrics: state.metrics,
      };
      
      await AsyncStorage.setItem('monitoringState', JSON.stringify(stateToSave));
      
    } catch (error) {
      console.error('❌ Error saving state:', error);
    }
  };

  /**
   * Toggle background monitoring
   */
  const toggleBackgroundMonitoring = (enabled: boolean) => {
    if (enabled) {
      startBackgroundMonitoring();
    } else {
      stopBackgroundMonitoring();
    }
  };

  /**
   * Manual refresh
   */
  const manualRefresh = async () => {
    console.log('🔄 Manual refresh triggered...');
    setState(prevState => ({ ...prevState, isMonitoring: true }));
    
    try {
      await performBackgroundMonitoring();
    } finally {
      setState(prevState => ({ ...prevState, isMonitoring: false }));
    }
  };

  /**
   * Clear all data
   */
  const clearData = () => {
    Alert.alert(
      'Clear Data',
      'Are you sure you want to clear all monitoring data?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setState(prevState => ({
              ...prevState,
              metrics: [],
              alertsCount: 0,
              lastUpdate: 'Never',
            }));
            AsyncStorage.removeItem('monitoringState');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <ScrollView contentInsetAdjustmentBehavior="automatic" style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>📱 Background Monitoring POC</Text>
          <Text style={styles.subtitle}>React Native Background Processing Demo</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔧 Controls</Text>
          
          <View style={styles.control}>
            <Text style={styles.controlLabel}>Background Monitoring</Text>
            <Switch
              value={state.backgroundEnabled}
              onValueChange={toggleBackgroundMonitoring}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={state.backgroundEnabled ? '#f5dd4b' : '#f4f3f4'}
            />
          </View>
          
          <TouchableOpacity style={styles.button} onPress={manualRefresh}>
            <Text style={styles.buttonText}>🔄 Manual Refresh</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.buttonSecondary} onPress={clearData}>
            <Text style={styles.buttonSecondaryText}>🗑️ Clear Data</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Status</Text>
          
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Network:</Text>
            <Text style={[styles.statusValue, { color: state.networkStatus ? '#4CAF50' : '#F44336' }]}>
              {state.networkStatus ? '✅ Connected' : '❌ Disconnected'}
            </Text>
          </View>
          
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Monitoring:</Text>
            <Text style={[styles.statusValue, { color: state.isMonitoring ? '#FF9800' : state.backgroundEnabled ? '#4CAF50' : '#757575' }]}>
              {state.isMonitoring ? '🔄 Active' : state.backgroundEnabled ? '✅ Enabled' : '⏹️ Disabled'}
            </Text>
          </View>
          
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Last Update:</Text>
            <Text style={styles.statusValue}>{state.lastUpdate}</Text>
          </View>
          
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Total Alerts:</Text>
            <Text style={[styles.statusValue, { color: state.alertsCount > 0 ? '#F44336' : '#4CAF50' }]}>
              {state.alertsCount}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📈 Recent Metrics</Text>
          
          {state.metrics.length === 0 ? (
            <Text style={styles.noData}>No metrics data available</Text>
          ) : (
            state.metrics.slice(-5).map((metric, index) => (
              <View key={index} style={styles.metricItem}>
                <Text style={styles.metricTime}>
                  {new Date(metric.timestamp).toLocaleTimeString()}
                </Text>
                <Text style={styles.metricData}>
                  CPU: {metric.cpu.toFixed(1)}% | Memory: {metric.memory.toFixed(1)}%
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginTop: 5,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 15,
  },
  control: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  controlLabel: {
    fontSize: 16,
    color: '#333333',
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonSecondary: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  buttonSecondaryText: {
    color: '#666666',
    fontSize: 16,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusLabel: {
    fontSize: 16,
    color: '#333333',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  noData: {
    fontSize: 16,
    color: '#999999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  metricItem: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  metricTime: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  metricData: {
    fontSize: 16,
    color: '#333333',
  },
});

export default App;
