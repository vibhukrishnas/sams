import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors, spacing, typography } from '../theme/theme';

const { width } = Dimensions.get('window');

interface ProgressBarProps {
  percentage: number;
  color?: string;
  height?: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ 
  percentage, 
  color = colors.primary, 
  height = 8 
}) => {
  return (
    <View style={[styles.progressContainer, { height }]}>
      <View 
        style={[
          styles.progressFill, 
          { 
            width: `${Math.min(percentage, 100)}%`, 
            backgroundColor: color,
            height 
          }
        ]} 
      />
    </View>
  );
};

interface MetricDisplayProps {
  title: string;
  value: number;
  unit: string;
  icon: string;
  color: string;
  details?: string;
}

const MetricDisplay: React.FC<MetricDisplayProps> = ({ 
  title, 
  value, 
  unit, 
  icon, 
  color, 
  details 
}) => {
  return (
    <View style={styles.metricContainer}>
      <LinearGradient
        colors={[colors.surface, colors.surfaceVariant]}
        style={styles.metricGradient}
      >
        <View style={styles.metricHeader}>
          <Icon name={icon} size={28} color={color} />
          <View style={styles.metricInfo}>
            <Text style={styles.metricTitle}>{title}</Text>
            <Text style={[styles.metricValue, { color }]}>
              {value.toFixed(1)}{unit}
            </Text>
          </View>
        </View>
        
        <ProgressBar 
          percentage={value} 
          color={color}
          height={12}
        />
        
        {details && (
          <Text style={styles.metricDetails}>{details}</Text>
        )}
      </LinearGradient>
    </View>
  );
};

const MonitoringScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [realTimeData, setRealTimeData] = useState({
    cpu: { value: 0, cores: 4, temperature: 0 },
    memory: { used: 0, total: 16, percentage: 0 },
    disk: { used: 0, total: 500, percentage: 0 },
    network: { upload: 0, download: 0, latency: 0 },
    uptime: { seconds: 0, formatted: '0h 0m' },
    processes: { count: 0, running: 0 },
  });

  const [connectionStatus, setConnectionStatus] = useState({
    connected: true,
    backend: 'Java Spring Boot',
    port: 8080,
    lastUpdate: new Date(),
  });

  useEffect(() => {
    loadMonitoringData();
    
    // Simulate real-time updates
    const interval = setInterval(() => {
      updateRealTimeData();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const loadMonitoringData = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateRealTimeData();
    } catch (error) {
      console.error('Failed to load monitoring data:', error);
    }
  };

  const updateRealTimeData = () => {
    setRealTimeData({
      cpu: {
        value: Math.random() * 100,
        cores: 4,
        temperature: 45 + Math.random() * 20,
      },
      memory: {
        used: 8 + Math.random() * 4,
        total: 16,
        percentage: (8 + Math.random() * 4) / 16 * 100,
      },
      disk: {
        used: 300 + Math.random() * 100,
        total: 500,
        percentage: (300 + Math.random() * 100) / 500 * 100,
      },
      network: {
        upload: Math.random() * 100,
        download: Math.random() * 1000,
        latency: 10 + Math.random() * 20,
      },
      uptime: {
        seconds: 1234567,
        formatted: '15d 4h 23m',
      },
      processes: {
        count: 200 + Math.floor(Math.random() * 100),
        running: 50 + Math.floor(Math.random() * 20),
      },
    });

    setConnectionStatus(prev => ({
      ...prev,
      lastUpdate: new Date(),
    }));
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadMonitoringData();
    setRefreshing(false);
  }, []);

  const getStatusColor = (percentage: number) => {
    if (percentage < 60) return colors.success;
    if (percentage < 80) return colors.warning;
    return colors.danger;
  };

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
      {/* Header */}
      <LinearGradient
        colors={[colors.primary, '#2563eb']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>System Monitor</Text>
          <Text style={styles.headerSubtitle}>
            Real-time performance metrics
          </Text>
        </View>
        
        <View style={styles.connectionInfo}>
          <View style={styles.connectionDot} />
          <Text style={styles.connectionText}>
            {connectionStatus.backend} • Port {connectionStatus.port}
          </Text>
        </View>
      </LinearGradient>

      {/* Real-time Status */}
      <View style={styles.statusSection}>
        <Text style={styles.sectionTitle}>Real-time Status</Text>
        <Text style={styles.lastUpdate}>
          Last updated: {connectionStatus.lastUpdate.toLocaleTimeString()}
        </Text>
      </View>

      {/* CPU Monitoring */}
      <MetricDisplay
        title="CPU Usage"
        value={realTimeData.cpu.value}
        unit="%"
        icon="memory"
        color={getStatusColor(realTimeData.cpu.value)}
        details={`${realTimeData.cpu.cores} cores • ${realTimeData.cpu.temperature.toFixed(1)}°C`}
      />

      {/* Memory Monitoring */}
      <MetricDisplay
        title="Memory Usage"
        value={realTimeData.memory.percentage}
        unit="%"
        icon="storage"
        color={getStatusColor(realTimeData.memory.percentage)}
        details={`${realTimeData.memory.used.toFixed(1)} GB / ${realTimeData.memory.total} GB`}
      />

      {/* Disk Monitoring */}
      <MetricDisplay
        title="Disk Usage"
        value={realTimeData.disk.percentage}
        unit="%"
        icon="save"
        color={getStatusColor(realTimeData.disk.percentage)}
        details={`${realTimeData.disk.used.toFixed(1)} GB / ${realTimeData.disk.total} GB SSD`}
      />

      {/* Network Activity */}
      <View style={styles.networkSection}>
        <Text style={styles.sectionTitle}>Network Activity</Text>
        <View style={styles.networkGrid}>
          <View style={styles.networkCard}>
            <Icon name="cloud-upload" size={24} color={colors.primary} />
            <Text style={styles.networkValue}>
              {realTimeData.network.upload.toFixed(1)} MB/s
            </Text>
            <Text style={styles.networkLabel}>Upload</Text>
          </View>
          
          <View style={styles.networkCard}>
            <Icon name="cloud-download" size={24} color={colors.success} />
            <Text style={styles.networkValue}>
              {realTimeData.network.download.toFixed(1)} MB/s
            </Text>
            <Text style={styles.networkLabel}>Download</Text>
          </View>
          
          <View style={styles.networkCard}>
            <Icon name="speed" size={24} color={colors.warning} />
            <Text style={styles.networkValue}>
              {realTimeData.network.latency.toFixed(0)} ms
            </Text>
            <Text style={styles.networkLabel}>Latency</Text>
          </View>
        </View>
      </View>

      {/* System Information */}
      <View style={styles.systemInfo}>
        <Text style={styles.sectionTitle}>System Information</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Icon name="schedule" size={20} color={colors.text} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Uptime</Text>
              <Text style={styles.infoValue}>{realTimeData.uptime.formatted}</Text>
            </View>
          </View>
          
          <View style={styles.infoCard}>
            <Icon name="list" size={20} color={colors.text} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Processes</Text>
              <Text style={styles.infoValue}>
                {realTimeData.processes.count} total • {realTimeData.processes.running} running
              </Text>
            </View>
          </View>
          
          <View style={styles.infoCard}>
            <Icon name="computer" size={20} color={colors.text} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Platform</Text>
              <Text style={styles.infoValue}>Windows Server 2022</Text>
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
  connectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginRight: spacing.sm,
  },
  connectionText: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  statusSection: {
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    ...typography.heading3,
    color: colors.text,
    fontWeight: '600',
  },
  lastUpdate: {
    ...typography.small,
    color: colors.textMuted,
  },
  metricContainer: {
    margin: spacing.md,
    borderRadius: 16,
    overflow: 'hidden',
  },
  metricGradient: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  metricInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  metricTitle: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  metricValue: {
    ...typography.heading2,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  metricDetails: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  progressContainer: {
    backgroundColor: colors.border,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: 6,
  },
  networkSection: {
    padding: spacing.md,
  },
  networkGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  networkCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    width: (width - spacing.md * 4) / 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  networkValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  networkLabel: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  systemInfo: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  infoGrid: {
    marginTop: spacing.md,
  },
  infoCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoContent: {
    marginLeft: spacing.md,
    flex: 1,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    ...typography.body,
    color: colors.text,
    marginTop: spacing.xs,
    fontWeight: '500',
  },
});

export default MonitoringScreen;
