import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { useGetSystemHealthQuery, useGetAlertsQuery, useGetServersQuery } from '../../store/api/samsApi';
import { showToast } from '../../store/slices/uiSlice';
import LoadingOverlay from '../../components/ui/LoadingOverlay';
import MetricCard from '../../components/dashboard/MetricCard';
import AlertSummaryCard from '../../components/dashboard/AlertSummaryCard';
import ServerStatusCard from '../../components/dashboard/ServerStatusCard';
import QuickActionsCard from '../../components/dashboard/QuickActionsCard';
import OfflineStatus from '../../components/OfflineStatus';
import QuickActions from '../../components/QuickActions';
import MobileFeatures from '../../services/MobileFeatures';
import PerformanceMonitor from '../../services/PerformanceMonitor';
import PerformanceOptimizer from '../../components/PerformanceOptimizer';

const { width } = Dimensions.get('window');

const EnhancedDashboardScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const mobileFeatures = MobileFeatures.getInstance();
  const performanceMonitor = PerformanceMonitor.getInstance();
  const { isOnline } = useAppSelector(state => state.offline);
  
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');

  // API queries
  const {
    data: systemHealth,
    isLoading: healthLoading,
    error: healthError,
    refetch: refetchHealth,
  } = useGetSystemHealthQuery();

  const {
    data: alerts,
    isLoading: alertsLoading,
    error: alertsError,
    refetch: refetchAlerts,
  } = useGetAlertsQuery({ status: 'active' });

  const {
    data: servers,
    isLoading: serversLoading,
    error: serversError,
    refetch: refetchServers,
  } = useGetServersQuery();

  useEffect(() => {
    // Set up auto-refresh
    const interval = setInterval(() => {
      if (isOnline) {
        refetchHealth();
        refetchAlerts();
        refetchServers();
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [isOnline]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchHealth(),
        refetchAlerts(),
        refetchServers(),
      ]);
      
      dispatch(showToast({
        message: 'Dashboard refreshed',
        type: 'success',
        duration: 2000,
      }));
    } catch (error) {
      dispatch(showToast({
        message: 'Failed to refresh dashboard',
        type: 'error',
        duration: 3000,
      }));
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleEmergencyAlert = () => {
    Alert.alert(
      'Emergency Alert',
      'Are you sure you want to send an emergency SOS alert?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send SOS',
          style: 'destructive',
          onPress: () => {
            // Navigate to emergency screen
            navigation.navigate('Emergency' as never);
          },
        },
      ]
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={styles.greeting}>
          Good {getTimeOfDay()}, {user?.username || 'User'}
        </Text>
        <Text style={styles.subtitle}>
          {isOnline ? 'System Status' : 'Offline Mode'}
        </Text>
      </View>
      
      <View style={styles.headerRight}>
        <TouchableOpacity
          style={styles.emergencyButton}
          onPress={handleEmergencyAlert}
        >
          <Icon name="emergency" size={24} color="#fff" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
        >
          <Icon name="refresh" size={24} color="#1976D2" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSystemOverview = () => {
    if (!systemHealth) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System Overview</Text>
        
        <View style={styles.metricsRow}>
          <MetricCard
            title="Total Servers"
            value={systemHealth.totalServers}
            icon="dns"
            color="#1976D2"
            trend={0}
          />
          
          <MetricCard
            title="Online"
            value={systemHealth.onlineServers}
            icon="check-circle"
            color="#4CAF50"
            trend={2}
          />
          
          <MetricCard
            title="Offline"
            value={systemHealth.offlineServers}
            icon="error"
            color="#F44336"
            trend={-1}
          />
        </View>
        
        <View style={styles.metricsRow}>
          <MetricCard
            title="Critical Alerts"
            value={systemHealth.criticalAlerts}
            icon="warning"
            color="#FF9800"
            trend={0}
          />
          
          <MetricCard
            title="Avg CPU"
            value={`${systemHealth.avgCpuUsage}%`}
            icon="memory"
            color="#9C27B0"
            trend={1}
          />
          
          <MetricCard
            title="Avg Memory"
            value={`${systemHealth.avgMemoryUsage}%`}
            icon="storage"
            color="#607D8B"
            trend={-1}
          />
        </View>
      </View>
    );
  };

  const renderAlertsSummary = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Recent Alerts</Text>
      <AlertSummaryCard
        alerts={alerts || []}
        onViewAll={() => navigation.navigate('Alerts' as never)}
      />
    </View>
  );

  const renderServerStatus = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Server Status</Text>
      <ServerStatusCard
        servers={servers || []}
        onViewAll={() => navigation.navigate('Servers' as never)}
      />
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <QuickActionsCard
        onAddServer={() => navigation.navigate('AddServer' as never)}
        onGenerateReport={() => navigation.navigate('Reports' as never)}
        onViewAnalytics={() => navigation.navigate('Analytics' as never)}
        onEmergencyAlert={handleEmergencyAlert}
      />
    </View>
  );

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 18) return 'Afternoon';
    return 'Evening';
  };

  const isLoading = healthLoading || alertsLoading || serversLoading;

  return (
    <SafeAreaView style={styles.container}>
      <OfflineStatus onSyncPress={onRefresh} />
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#1976D2']}
            tintColor="#1976D2"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderHeader()}
        {renderSystemOverview()}
        {renderAlertsSummary()}
        {renderServerStatus()}
        {renderQuickActions()}
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Last updated: {new Date().toLocaleTimeString()}
          </Text>
          <View style={styles.connectionStatus}>
            <Icon
              name={isOnline ? 'wifi' : 'wifi-off'}
              size={16}
              color={isOnline ? '#4CAF50' : '#F44336'}
            />
            <Text style={[
              styles.connectionText,
              { color: isOnline ? '#4CAF50' : '#F44336' }
            ]}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
      </ScrollView>
      
      {isLoading && <LoadingOverlay message="Loading dashboard..." />}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emergencyButton: {
    backgroundColor: '#F44336',
    borderRadius: 20,
    padding: 8,
    marginRight: 12,
  },
  refreshButton: {
    padding: 8,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
});

export default EnhancedDashboardScreen;
