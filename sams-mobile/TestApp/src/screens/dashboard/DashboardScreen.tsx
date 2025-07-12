/**
 * 📊 Dashboard Screen - Core Mobile Dashboard
 * Real-time monitoring dashboard with offline support and key metrics
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';

// Components
import MetricCard from '../../components/MetricCard';
import ServerStatusCard from '../../components/ServerStatusCard';
import AlertSummaryCard from '../../components/AlertSummaryCard';
import NetworkStatusBanner from '../../components/NetworkStatusBanner';

// Services
import { fetchServers, fetchAlerts } from '../../services/InfraService';
import AuthenticationService from '../../services/AuthenticationService';

// Types
import { RootState } from '../../store/store';

interface DashboardMetrics {
  totalServers: number;
  onlineServers: number;
  offlineServers: number;
  criticalAlerts: number;
  warningAlerts: number;
  totalAlerts: number;
  avgResponseTime: number;
  uptime: number;
}

interface ServerSummary {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'warning';
  responseTime: number;
  uptime: number;
}

const { width } = Dimensions.get('window');

const DashboardScreen: React.FC = () => {
  const dispatch = useDispatch();
  const { servers, loading: serversLoading } = useSelector((state: RootState) => state.servers);
  const { alerts, loading: alertsLoading } = useSelector((state: RootState) => state.alerts);
  const { user } = useSelector((state: RootState) => state.auth);

  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalServers: 0,
    onlineServers: 0,
    offlineServers: 0,
    criticalAlerts: 0,
    warningAlerts: 0,
    totalAlerts: 0,
    avgResponseTime: 0,
    uptime: 0,
  });
  const [recentServers, setRecentServers] = useState<ServerSummary[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Network status monitoring
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
      if (state.isConnected) {
        // Auto-refresh when coming back online
        handleRefresh();
      }
    });

    return unsubscribe;
  }, []);

  // Focus effect to refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      if (isOnline) {
        // Fetch fresh data from API
        await Promise.all([
          dispatch(fetchServers()),
          dispatch(fetchAlerts()),
        ]);
      } else {
        // Load cached data when offline
        await loadCachedData();
      }
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      // Fallback to cached data on error
      await loadCachedData();
    }
  };

  // Load cached data for offline mode
  const loadCachedData = async () => {
    try {
      const cachedServers = await AsyncStorage.getItem('cached_servers');
      const cachedAlerts = await AsyncStorage.getItem('cached_alerts');
      
      if (cachedServers) {
        const serverData = JSON.parse(cachedServers);
        // Update Redux store with cached data
        dispatch(setServers(serverData));
      }
      
      if (cachedAlerts) {
        const alertData = JSON.parse(cachedAlerts);
        dispatch(setAlerts(alertData));
      }
    } catch (error) {
      console.error('❌ Error loading cached data:', error);
    }
  };

  // Calculate metrics from servers and alerts data
  useEffect(() => {
    const calculateMetrics = () => {
      const totalServers = servers.length;
      const onlineServers = servers.filter(s => s.status === 'online').length;
      const offlineServers = servers.filter(s => s.status === 'offline').length;
      
      const criticalAlerts = alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length;
      const warningAlerts = alerts.filter(a => a.severity === 'warning' && !a.acknowledged).length;
      const totalAlerts = alerts.filter(a => !a.acknowledged).length;
      
      const avgResponseTime = servers.reduce((sum, server) => sum + (server.responseTime || 0), 0) / totalServers || 0;
      const uptime = servers.reduce((sum, server) => sum + (server.uptime || 0), 0) / totalServers || 0;

      setMetrics({
        totalServers,
        onlineServers,
        offlineServers,
        criticalAlerts,
        warningAlerts,
        totalAlerts,
        avgResponseTime,
        uptime,
      });

      // Set recent servers (top 5 by last activity)
      const sortedServers = [...servers]
        .sort((a, b) => new Date(b.lastUpdated || 0).getTime() - new Date(a.lastUpdated || 0).getTime())
        .slice(0, 5)
        .map(server => ({
          id: server.id,
          name: server.name,
          status: server.status,
          responseTime: server.responseTime || 0,
          uptime: server.uptime || 0,
        }));
      
      setRecentServers(sortedServers);
    };

    calculateMetrics();
  }, [servers, alerts]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  // Handle metric card press
  const handleMetricPress = (type: string) => {
    switch (type) {
      case 'servers':
        // Navigate to servers screen
        break;
      case 'alerts':
        // Navigate to alerts screen
        break;
      default:
        break;
    }
  };

  // Handle server card press
  const handleServerPress = (serverId: string) => {
    // Navigate to server detail screen
  };

  // Handle emergency SOS
  const handleEmergencySOS = () => {
    Alert.alert(
      'Emergency SOS',
      'This will send an emergency alert to all administrators. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Send SOS', 
          style: 'destructive',
          onPress: () => {
            // Implement SOS functionality
            console.log('🆘 Emergency SOS triggered');
          }
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Network Status Banner */}
      {!isOnline && <NetworkStatusBanner />}
      
      {/* Header */}
      <LinearGradient
        colors={['#2196F3', '#1976D2']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.username || 'User'}</Text>
          </View>
          <TouchableOpacity 
            style={styles.sosButton}
            onPress={handleEmergencySOS}
          >
            <Icon name="emergency" size={24} color="#FFFFFF" />
            <Text style={styles.sosText}>SOS</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.lastUpdated}>
          Last updated: {lastUpdated.toLocaleTimeString()}
        </Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#2196F3']}
            tintColor="#2196F3"
          />
        }
      >
        {/* Key Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Overview</Text>
          <View style={styles.metricsGrid}>
            <MetricCard
              title="Total Servers"
              value={metrics.totalServers.toString()}
              icon="dns"
              color="#2196F3"
              onPress={() => handleMetricPress('servers')}
            />
            <MetricCard
              title="Online"
              value={metrics.onlineServers.toString()}
              icon="check-circle"
              color="#4CAF50"
              onPress={() => handleMetricPress('servers')}
            />
            <MetricCard
              title="Offline"
              value={metrics.offlineServers.toString()}
              icon="error"
              color="#F44336"
              onPress={() => handleMetricPress('servers')}
            />
            <MetricCard
              title="Active Alerts"
              value={metrics.totalAlerts.toString()}
              icon="warning"
              color="#FF9800"
              onPress={() => handleMetricPress('alerts')}
            />
          </View>
        </View>

        {/* Performance Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance</Text>
          <View style={styles.performanceGrid}>
            <MetricCard
              title="Avg Response"
              value={`${metrics.avgResponseTime.toFixed(0)}ms`}
              icon="speed"
              color="#9C27B0"
              subtitle="Response Time"
            />
            <MetricCard
              title="System Uptime"
              value={`${metrics.uptime.toFixed(1)}%`}
              icon="trending-up"
              color="#00BCD4"
              subtitle="Overall Uptime"
            />
          </View>
        </View>

        {/* Alert Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alert Summary</Text>
          <AlertSummaryCard
            criticalCount={metrics.criticalAlerts}
            warningCount={metrics.warningAlerts}
            totalCount={metrics.totalAlerts}
            onPress={() => handleMetricPress('alerts')}
          />
        </View>

        {/* Recent Server Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Server Activity</Text>
          {recentServers.map((server) => (
            <ServerStatusCard
              key={server.id}
              server={server}
              onPress={() => handleServerPress(server.id)}
            />
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.actionButton}>
              <Icon name="add" size={24} color="#2196F3" />
              <Text style={styles.actionText}>Add Server</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Icon name="refresh" size={24} color="#2196F3" />
              <Text style={styles.actionText}>Refresh All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Icon name="settings" size={24} color="#2196F3" />
              <Text style={styles.actionText}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  welcomeText: {
    color: '#FFFFFF',
    fontSize: 16,
    opacity: 0.9,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  sosButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    minWidth: 60,
  },
  sosText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },
  lastUpdated: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.8,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 15,
    marginTop: 10,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  performanceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
  },
  actionButton: {
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    minWidth: 80,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionText: {
    marginTop: 5,
    fontSize: 12,
    color: '#333333',
    textAlign: 'center',
  },
});

export default DashboardScreen;
