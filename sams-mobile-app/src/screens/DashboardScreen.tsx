import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors, spacing, typography } from '../theme/theme';

const { width } = Dimensions.get('window');

interface MetricCardProps {
  title: string;
  value: string;
  icon: string;
  status: 'good' | 'warning' | 'critical';
  subtitle?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, status, subtitle }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'good': return colors.success;
      case 'warning': return colors.warning;
      case 'critical': return colors.danger;
      default: return colors.primary;
    }
  };

  return (
    <View style={styles.metricCard}>
      <LinearGradient
        colors={[colors.surface, colors.surfaceVariant]}
        style={styles.metricCardGradient}
      >
        <View style={styles.metricHeader}>
          <Icon name={icon} size={24} color={getStatusColor()} />
          <Text style={styles.metricTitle}>{title}</Text>
        </View>
        <Text style={[styles.metricValue, { color: getStatusColor() }]}>
          {value}
        </Text>
        {subtitle && (
          <Text style={styles.metricSubtitle}>{subtitle}</Text>
        )}
      </LinearGradient>
    </View>
  );
};

const DashboardScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState({
    cpu: { value: 45, status: 'good' as const },
    memory: { value: 68, status: 'warning' as const },
    disk: { value: 82, status: 'critical' as const },
    network: { value: 'Active', status: 'good' as const },
    uptime: { value: '15d 4h 23m', status: 'good' as const },
    processes: { value: 247, status: 'good' as const },
  });

  const [systemInfo, setSystemInfo] = useState({
    backend: 'Java Spring Boot',
    port: '8080',
    status: 'Connected',
    lastUpdate: new Date(),
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update metrics with simulated data
      setMetrics({
        cpu: { value: Math.floor(Math.random() * 100), status: 'good' },
        memory: { value: Math.floor(Math.random() * 100), status: 'warning' },
        disk: { value: Math.floor(Math.random() * 100), status: 'critical' },
        network: { value: 'Active', status: 'good' },
        uptime: { value: '15d 4h 23m', status: 'good' },
        processes: { value: Math.floor(Math.random() * 500) + 100, status: 'good' },
      });

      setSystemInfo(prev => ({
        ...prev,
        lastUpdate: new Date(),
      }));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, []);

  const getOverallStatus = () => {
    const criticalCount = Object.values(metrics).filter(m => m.status === 'critical').length;
    const warningCount = Object.values(metrics).filter(m => m.status === 'warning').length;
    
    if (criticalCount > 0) return { text: 'CRITICAL', color: colors.danger };
    if (warningCount > 0) return { text: 'WARNING', color: colors.warning };
    return { text: 'HEALTHY', color: colors.success };
  };

  const overallStatus = getOverallStatus();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {/* Header Section */}
      <LinearGradient
        colors={[colors.primary, '#2563eb']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>SAMS Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            Last updated: {systemInfo.lastUpdate.toLocaleTimeString()}
          </Text>
        </View>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: overallStatus.color }]} />
          <Text style={[styles.statusText, { color: overallStatus.color }]}>
            {overallStatus.text}
          </Text>
        </View>
      </LinearGradient>

      {/* Backend Info */}
      <View style={styles.backendInfo}>
        <Text style={styles.backendTitle}>Active Backend</Text>
        <View style={styles.backendDetails}>
          <Text style={styles.backendText}>
            {systemInfo.backend} • Port {systemInfo.port}
          </Text>
          <View style={styles.connectionStatus}>
            <View style={styles.connectionDot} />
            <Text style={styles.connectionText}>{systemInfo.status}</Text>
          </View>
        </View>
      </View>

      {/* Quick Stats Grid */}
      <View style={styles.quickStats}>
        <Text style={styles.sectionTitle}>System Overview</Text>
        <View style={styles.statsGrid}>
          <MetricCard
            title="CPU Usage"
            value={`${metrics.cpu.value}%`}
            icon="memory"
            status={metrics.cpu.status}
            subtitle="4 cores active"
          />
          <MetricCard
            title="Memory"
            value={`${metrics.memory.value}%`}
            icon="storage"
            status={metrics.memory.status}
            subtitle="16 GB total"
          />
          <MetricCard
            title="Disk Usage"
            value={`${metrics.disk.value}%`}
            icon="hard-drive"
            status={metrics.disk.status}
            subtitle="500 GB SSD"
          />
          <MetricCard
            title="Network"
            value={metrics.network.value}
            icon="wifi"
            status={metrics.network.status}
            subtitle="1 Gbps link"
          />
          <MetricCard
            title="Uptime"
            value={metrics.uptime.value}
            icon="schedule"
            status={metrics.uptime.status}
            subtitle="High availability"
          />
          <MetricCard
            title="Processes"
            value={metrics.processes.value.toString()}
            icon="list"
            status={metrics.processes.status}
            subtitle="Running tasks"
          />
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard}>
            <LinearGradient
              colors={[colors.primary, '#2563eb']}
              style={styles.actionGradient}
            >
              <Icon name="monitor" size={32} color="#ffffff" />
              <Text style={styles.actionText}>Monitor</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionCard}>
            <LinearGradient
              colors={[colors.success, '#059669']}
              style={styles.actionGradient}
            >
              <Icon name="terminal" size={32} color="#ffffff" />
              <Text style={styles.actionText}>Commands</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionCard}>
            <LinearGradient
              colors={[colors.warning, '#d97706']}
              style={styles.actionGradient}
            >
              <Icon name="assessment" size={32} color="#ffffff" />
              <Text style={styles.actionText}>Reports</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionCard}>
            <LinearGradient
              colors={[colors.danger, '#dc2626']}
              style={styles.actionGradient}
            >
              <Icon name="notifications" size={32} color="#ffffff" />
              <Text style={styles.actionText}>Alerts</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.recentActivity}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityList}>
          <View style={styles.activityItem}>
            <Icon name="info" size={20} color={colors.primary} />
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>System monitoring started</Text>
              <Text style={styles.activityTime}>2 minutes ago</Text>
            </View>
          </View>
          
          <View style={styles.activityItem}>
            <Icon name="check-circle" size={20} color={colors.success} />
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Backend connection established</Text>
              <Text style={styles.activityTime}>5 minutes ago</Text>
            </View>
          </View>
          
          <View style={styles.activityItem}>
            <Icon name="warning" size={20} color={colors.warning} />
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>High memory usage detected</Text>
              <Text style={styles.activityTime}>10 minutes ago</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  headerContent: {
    marginBottom: spacing.md,
  },
  headerTitle: {
    ...typography.heading1,
    color: '#ffffff',
    fontWeight: '700',
  },
  headerSubtitle: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: spacing.xs,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  statusText: {
    ...typography.body,
    fontWeight: '600',
  },
  backendInfo: {
    backgroundColor: colors.surface,
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backendTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  backendDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backendText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginRight: spacing.xs,
  },
  connectionText: {
    ...typography.small,
    color: colors.success,
    fontWeight: '500',
  },
  quickStats: {
    padding: spacing.md,
  },
  sectionTitle: {
    ...typography.heading3,
    color: colors.text,
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: (width - spacing.md * 3) / 2,
    marginBottom: spacing.md,
    borderRadius: 12,
    overflow: 'hidden',
  },
  metricCardGradient: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  metricTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    fontWeight: '500',
  },
  metricValue: {
    ...typography.heading2,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  metricSubtitle: {
    ...typography.small,
    color: colors.textMuted,
  },
  quickActions: {
    padding: spacing.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: (width - spacing.md * 3) / 2,
    height: 80,
    marginBottom: spacing.md,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    ...typography.caption,
    color: '#ffffff',
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  recentActivity: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  activityList: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  activityContent: {
    marginLeft: spacing.md,
    flex: 1,
  },
  activityTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  activityTime: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});

export default DashboardScreen;
