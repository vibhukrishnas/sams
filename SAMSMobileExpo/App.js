import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
  StatusBar,
  SafeAreaView
} from 'react-native';
import MonitoringService from './src/services/monitoring';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');

  useEffect(() => {
    loadMetrics();
  import React from 'react';
  import { NavigationContainer } from '@react-navigation/native';
  import { createNativeStackNavigator } from '@react-navigation/native-stack';
  import ServerManagementScreen from './src/screens/ServerManagementScreen';
  import ViewLogsScreen from './src/screens/ViewLogsScreen';
  
  const Stack = createNativeStackNavigator();
  }, []);

  const loadMetrics = async () => {
    try {
      if (!refreshing) setLoading(true);
      
      // Test connection first
      const healthCheck = await MonitoringService.getHealth();
      if (healthCheck.success) {
        setConnectionStatus('Connected');
        
        // Load comprehensive metrics
        const result = await MonitoringService.getAllMetrics();
        if (result.success) {
          setMetrics(result.data);
          setLastUpdate(new Date().toLocaleTimeString());
        } else {
          throw new Error(result.error);
        }
      } else {
        setConnectionStatus('Disconnected');
        throw new Error('Backend not available');
      }
    } catch (error) {
      setConnectionStatus('Error');
      Alert.alert('Connection Error', `Unable to connect to SAMS backend: ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMetrics();
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Connected': return '#4CAF50';
      case 'Disconnected': return '#F44336';
      case 'Error': return '#FF9800';
      default: return '#2196F3';
    }
  };

  if (loading && !metrics) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1976D2" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading SAMS Monitoring...</Text>
          <Text style={styles.connectionStatus}>Connecting to Java Backend...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1976D2" />
      
      {/* Header */}
      <View style={styles.header}>
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="ServerManagement" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="ServerManagement" component={ServerManagementScreen} />
        <Stack.Screen name="ViewLogs" component={ViewLogsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
        <Text style={styles.headerTitle}>SAMS Mobile</Text>
        <View style={styles.statusContainer}>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(connectionStatus) }]} />
          <Text style={styles.statusText}>{connectionStatus}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Last Update */}
        {lastUpdate && (
          <View style={styles.updateContainer}>
            <Text style={styles.updateText}>Last Update: {lastUpdate}</Text>
          </View>
        )}

        {/* System Overview */}
        {metrics?.system && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>System Information</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Hostname:</Text>
              <Text style={styles.infoValue}>{metrics.system.hostname}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>OS:</Text>
              <Text style={styles.infoValue}>{metrics.system.os}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Architecture:</Text>
              <Text style={styles.infoValue}>{metrics.system.architecture}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Processors:</Text>
              <Text style={styles.infoValue}>{metrics.system.processors}</Text>
            </View>
          </View>
        )}

        {/* CPU Metrics */}
        {metrics?.cpu && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>CPU Metrics</Text>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Cores:</Text>
              <Text style={styles.metricValue}>{metrics.cpu.cores}</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Model:</Text>
              <Text style={styles.metricValueSmall}>{metrics.cpu.model}</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Usage:</Text>
              <Text style={[styles.metricValue, { color: metrics.cpu.usage_percent > 80 ? '#F44336' : '#4CAF50' }]}>
                {metrics.cpu.usage_percent?.toFixed(1) || 0}%
              </Text>
            </View>
          </View>
        )}

        {/* Memory Metrics */}
        {metrics?.memory && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Memory Metrics</Text>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Total:</Text>
              <Text style={styles.metricValue}>{formatBytes(metrics.memory.total)}</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Used:</Text>
              <Text style={styles.metricValue}>{formatBytes(metrics.memory.used)}</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Available:</Text>
              <Text style={styles.metricValue}>{formatBytes(metrics.memory.available)}</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Usage:</Text>
              <Text style={[styles.metricValue, { color: metrics.memory.usage_percent > 85 ? '#F44336' : '#4CAF50' }]}>
                {metrics.memory.usage_percent?.toFixed(1) || 0}%
              </Text>
            </View>
          </View>
        )}

        {/* Disk Metrics */}
        {metrics?.disk && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Disk Metrics</Text>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Total:</Text>
              <Text style={styles.metricValue}>{formatBytes(metrics.disk.total)}</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Used:</Text>
              <Text style={styles.metricValue}>{formatBytes(metrics.disk.used)}</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Free:</Text>
              <Text style={styles.metricValue}>{formatBytes(metrics.disk.free)}</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Usage:</Text>
              <Text style={[styles.metricValue, { color: metrics.disk.usage_percent > 90 ? '#F44336' : '#4CAF50' }]}>
                {metrics.disk.usage_percent?.toFixed(1) || 0}%
              </Text>
            </View>
          </View>
        )}

        {/* Network Metrics */}
        {metrics?.network && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Network Metrics</Text>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Bytes Sent:</Text>
              <Text style={styles.metricValue}>{formatBytes(metrics.network.bytes_sent)}</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Bytes Received:</Text>
              <Text style={styles.metricValue}>{formatBytes(metrics.network.bytes_recv)}</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Packets Sent:</Text>
              <Text style={styles.metricValue}>{metrics.network.packets_sent?.toLocaleString()}</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Packets Received:</Text>
              <Text style={styles.metricValue}>{metrics.network.packets_recv?.toLocaleString()}</Text>
            </View>
          </View>
        )}

        {/* Alerts */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Active Alerts</Text>
          {metrics?.alerts && metrics.alerts.length > 0 ? (
            metrics.alerts.map((alert, index) => (
              <View key={index} style={styles.alertItem}>
                <Text style={styles.alertText}>{alert.message}</Text>
                <Text style={styles.alertTime}>{alert.timestamp}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.noAlertsText}>No active alerts</Text>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={loadMetrics}>
            <Text style={styles.actionButtonText}>Refresh Metrics</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.secondaryButton]} 
            onPress={() => Alert.alert('SAMS Mobile', 'Connected to Java Backend on port 5002')}
          >
            <Text style={styles.actionButtonText}>Backend Info</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>SAMS Mobile - Live Monitoring</Text>
          <Text style={styles.footerText}>Backend: Java Spring Boot</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1976D2',
  },
  loadingText: {
    fontSize: 24,
    color: 'white',
    marginBottom: 10,
  },
  connectionStatus: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  header: {
    backgroundColor: '#1976D2',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  updateContainer: {
    padding: 10,
    backgroundColor: 'rgba(25, 118, 210, 0.1)',
    alignItems: 'center',
  },
  updateText: {
    fontSize: 12,
    color: '#666',
  },
  card: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    flex: 1,
  },
  metricValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
    textAlign: 'right',
  },
  metricValueSmall: {
    fontSize: 12,
    color: '#333',
    textAlign: 'right',
    flex: 2,
  },
  alertItem: {
    backgroundColor: '#ffebee',
    padding: 10,
    borderRadius: 4,
    marginBottom: 8,
  },
  alertText: {
    fontSize: 14,
    color: '#c62828',
  },
  alertTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  noAlertsText: {
    fontSize: 14,
    color: '#4CAF50',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actionsContainer: {
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 5,
  },
  secondaryButton: {
    backgroundColor: '#666',
  },
  actionButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});
