import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { useGetSystemHealthQuery, useGetAlertsQuery, useGetServersQuery } from '../store/api/samsApi';
import { setLastRefresh } from '../store/slices/uiSlice';
import { getTheme } from '../theme';
import { BottomTabScreenProps } from '../navigation/types';

type Props = BottomTabScreenProps<'Dashboard'>;

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

const DashboardScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const isDark = useAppSelector(state => state.ui.theme === 'dark');
  const theme = getTheme(isDark);

  const {
    data: healthData,
    isLoading: healthLoading,
    refetch: refetchHealth,
  } = useGetSystemHealthQuery();

  const {
    data: alertsData,
    isLoading: alertsLoading,
    refetch: refetchAlerts,
  } = useGetAlertsQuery({});

  const {
    data: serversData,
    isLoading: serversLoading,
    refetch: refetchServers,
  } = useGetServersQuery();

  const isLoading = healthLoading || alertsLoading || serversLoading;

  const onRefresh = useCallback(async () => {
    await Promise.all([
      refetchHealth(),
      refetchAlerts(),
      refetchServers(),
    ]);
    dispatch(setLastRefresh(new Date().toISOString()));
  }, [refetchHealth, refetchAlerts, refetchServers, dispatch]);

  useEffect(() => {
    const interval = setInterval(() => {
      onRefresh();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [onRefresh]);

  const criticalAlerts = alertsData?.filter(alert => alert.severity === 'critical' && !alert.resolved) || [];
  const warningAlerts = alertsData?.filter(alert => alert.severity === 'warning' && !alert.resolved) || [];
  const onlineServers = serversData?.filter(server => server.status === 'online') || [];
  const offlineServers = serversData?.filter(server => server.status === 'offline') || [];

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: string;
    color: string;
    onPress?: () => void;
  }> = ({ title, value, icon, color, onPress }) => (
    <TouchableOpacity
      style={[styles.statCard, { backgroundColor: theme.colors.card }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.statCardContent}>
        <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
          <Icon name={icon} size={24} color={color} />
        </View>
        <Text style={[styles.statValue, { color: theme.colors.text }]}>
          {value}
        </Text>
        <Text style={[styles.statTitle, { color: theme.colors.textSecondary }]}>
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const QuickActionCard: React.FC<{
    title: string;
    subtitle: string;
    icon: string;
    color: string;
    onPress: () => void;
  }> = ({ title, subtitle, icon, color, onPress }) => (
    <TouchableOpacity
      style={[styles.actionCard, { backgroundColor: theme.colors.card }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={[color, color + 'CC']}
        style={styles.actionCardGradient}
      >
        <Icon name={icon} size={32} color={theme.colors.white} />
      </LinearGradient>
      <View style={styles.actionCardContent}>
        <Text style={[styles.actionTitle, { color: theme.colors.text }]}>
          {title}
        </Text>
        <Text style={[styles.actionSubtitle, { color: theme.colors.textSecondary }]}>
          {subtitle}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={onRefresh}
          colors={[theme.colors.primary]}
          tintColor={theme.colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.welcomeText, { color: theme.colors.textSecondary }]}>
          Welcome back!
        </Text>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          System Overview
        </Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard
          title="Total Servers"
          value={serversData?.length || 0}
          icon="computer"
          color={theme.colors.primary}
          onPress={() => navigation.navigate('Servers')}
        />
        <StatCard
          title="Online"
          value={onlineServers.length}
          icon="check-circle"
          color={theme.colors.success}
          onPress={() => navigation.navigate('Servers')}
        />
        <StatCard
          title="Critical Alerts"
          value={criticalAlerts.length}
          icon="error"
          color={theme.colors.error}
          onPress={() => navigation.navigate('Alerts')}
        />
        <StatCard
          title="Warnings"
          value={warningAlerts.length}
          icon="warning"
          color={theme.colors.warning}
          onPress={() => navigation.navigate('Alerts')}
        />
      </View>

      {/* System Status */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          System Status
        </Text>
        <View style={[styles.statusCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: theme.colors.success }]} />
              <Text style={[styles.statusText, { color: theme.colors.text }]}>
                {onlineServers.length} Online
              </Text>
            </View>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: theme.colors.error }]} />
              <Text style={[styles.statusText, { color: theme.colors.text }]}>
                {offlineServers.length} Offline
              </Text>
            </View>
          </View>
          <View style={styles.statusProgress}>
            <View
              style={[
                styles.progressBar,
                {
                  backgroundColor: theme.colors.success,
                  width: `${serversData?.length ? (onlineServers.length / serversData.length) * 100 : 0}%`,
                },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Quick Actions
        </Text>
        <QuickActionCard
          title="View All Alerts"
          subtitle={`${alertsData?.length || 0} total alerts`}
          icon="notifications"
          color={theme.colors.warning}
          onPress={() => navigation.navigate('Alerts')}
        />
        <QuickActionCard
          title="Manage Servers"
          subtitle="Add, edit, or monitor servers"
          icon="dns"
          color={theme.colors.primary}
          onPress={() => navigation.navigate('Servers')}
        />
        <QuickActionCard
          title="Generate Reports"
          subtitle="Create system reports"
          icon="assessment"
          color={theme.colors.secondary}
          onPress={() => navigation.navigate('Reports')}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  welcomeText: {
    fontSize: 14,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    width: cardWidth,
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  statCardContent: {
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statusCard: {
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusProgress: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  actionCard: {
    flexDirection: 'row',
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    overflow: 'hidden',
  },
  actionCardGradient: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCardContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
  },
});

export default DashboardScreen;
