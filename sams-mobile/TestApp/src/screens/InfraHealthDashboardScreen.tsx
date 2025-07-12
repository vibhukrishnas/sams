/**
 * 📊 Infrastructure Health Dashboard
 * Real-time monitoring dashboard with comprehensive infrastructure visibility
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

interface SystemMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  status: 'good' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  history: number[];
  threshold: {
    warning: number;
    critical: number;
  };
}

interface ServerHealth {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'maintenance';
  performanceScore: number;
  lastHeartbeat: Date;
  agentConnected: boolean;
  metrics: {
    cpu: { current: number; average: number; peak: number };
    memory: { used: number; available: number; swap: number };
    disk: { usage: number; io: number };
    network: { bandwidth: number; packets: number; errors: number };
  };
}

interface InfrastructureOverview {
  totalServers: number;
  onlineServers: number;
  offlineServers: number;
  maintenanceServers: number;
  criticalAlerts: number;
  warningAlerts: number;
  systemPerformanceScore: number;
  networkUtilization: number;
}

const InfraHealthDashboardScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');
  const [showServerDetails, setShowServerDetails] = useState(false);
  const [selectedServer, setSelectedServer] = useState<ServerHealth | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Infrastructure Overview Data
  const [overview, setOverview] = useState<InfrastructureOverview>({
    totalServers: 12,
    onlineServers: 9,
    offlineServers: 2,
    maintenanceServers: 1,
    criticalAlerts: 3,
    warningAlerts: 7,
    systemPerformanceScore: 78,
    networkUtilization: 65,
  });

  // System Metrics with Historical Data
  const [systemMetrics, setSystemMetrics] = useState<SystemMetric[]>([
    {
      id: '1',
      name: 'CPU Usage',
      value: 45,
      unit: '%',
      status: 'good',
      trend: 'stable',
      history: [42, 44, 43, 45, 46, 45, 44, 43, 45, 47],
      threshold: { warning: 70, critical: 90 }
    },
    {
      id: '2',
      name: 'Memory Usage',
      value: 78,
      unit: '%',
      status: 'warning',
      trend: 'up',
      history: [70, 72, 74, 76, 78, 77, 79, 78, 76, 78],
      threshold: { warning: 75, critical: 90 }
    },
    {
      id: '3',
      name: 'Disk Usage',
      value: 92,
      unit: '%',
      status: 'critical',
      trend: 'up',
      history: [85, 87, 88, 89, 90, 91, 92, 91, 92, 92],
      threshold: { warning: 80, critical: 90 }
    },
    {
      id: '4',
      name: 'Network I/O',
      value: 234,
      unit: 'MB/s',
      status: 'good',
      trend: 'down',
      history: [250, 245, 240, 238, 235, 234, 232, 234, 236, 234],
      threshold: { warning: 500, critical: 800 }
    },
    {
      id: '5',
      name: 'Response Time',
      value: 156,
      unit: 'ms',
      status: 'warning',
      trend: 'up',
      history: [120, 125, 130, 135, 140, 145, 150, 152, 154, 156],
      threshold: { warning: 150, critical: 300 }
    },
    {
      id: '6',
      name: 'Active Sessions',
      value: 1247,
      unit: 'sessions',
      status: 'good',
      trend: 'stable',
      history: [1200, 1210, 1220, 1230, 1240, 1245, 1247, 1250, 1248, 1247],
      threshold: { warning: 2000, critical: 3000 }
    }
  ]);

  // Server Health Data
  const [serverHealth, setServerHealth] = useState<ServerHealth[]>([
    {
      id: '1',
      name: 'Web Server 01',
      status: 'online',
      performanceScore: 85,
      lastHeartbeat: new Date(Date.now() - 30000),
      agentConnected: true,
      metrics: {
        cpu: { current: 45, average: 42, peak: 67 },
        memory: { used: 68, available: 32, swap: 5 },
        disk: { usage: 72, io: 45 },
        network: { bandwidth: 125, packets: 1250, errors: 0 }
      }
    },
    {
      id: '2',
      name: 'Database Server',
      status: 'online',
      performanceScore: 92,
      lastHeartbeat: new Date(Date.now() - 15000),
      agentConnected: true,
      metrics: {
        cpu: { current: 32, average: 35, peak: 58 },
        memory: { used: 85, available: 15, swap: 12 },
        disk: { usage: 45, io: 78 },
        network: { bandwidth: 89, packets: 890, errors: 2 }
      }
    },
    {
      id: '3',
      name: 'App Server 01',
      status: 'maintenance',
      performanceScore: 0,
      lastHeartbeat: new Date(Date.now() - 300000),
      agentConnected: false,
      metrics: {
        cpu: { current: 0, average: 0, peak: 0 },
        memory: { used: 0, available: 0, swap: 0 },
        disk: { usage: 88, io: 0 },
        network: { bandwidth: 0, packets: 0, errors: 0 }
      }
    },
    {
      id: '4',
      name: 'Load Balancer',
      status: 'offline',
      performanceScore: 0,
      lastHeartbeat: new Date(Date.now() - 7200000),
      agentConnected: false,
      metrics: {
        cpu: { current: 0, average: 0, peak: 0 },
        memory: { used: 0, available: 0, swap: 0 },
        disk: { usage: 65, io: 0 },
        network: { bandwidth: 0, packets: 0, errors: 0 }
      }
    }
  ]);

  // Auto-refresh effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        onRefresh();
      }, 30000); // Refresh every 30 seconds
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': case 'online': return '#00FF88';
      case 'warning': case 'maintenance': return '#FFA500';
      case 'critical': case 'offline': return '#FF3366';
      default: return '#666';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return 'trending-up';
      case 'down': return 'trending-down';
      case 'stable': return 'trending-flat';
      default: return 'trending-flat';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return '#FF3366';
      case 'down': return '#00FF88';
      case 'stable': return '#666';
      default: return '#666';
    }
  };

  const getPerformanceScoreColor = (score: number) => {
    if (score >= 80) return '#00FF88';
    if (score >= 60) return '#FFA500';
    return '#FF3366';
  };

  const formatLastHeartbeat = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const timeRanges = [
    { key: '1h', label: 'Last Hour' },
    { key: '24h', label: '24 Hours' },
    { key: '7d', label: '7 Days' },
    { key: '30d', label: '30 Days' }
  ];

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate data refresh
    setTimeout(() => {
      setLastUpdated(new Date());

      // Update metrics with simulated real-time data
      setSystemMetrics(prev => prev.map(metric => {
        const newValue = metric.value + (Math.random() - 0.5) * 10;
        const clampedValue = Math.max(0, Math.min(100, newValue));
        const newHistory = [...metric.history.slice(1), clampedValue];

        return {
          ...metric,
          value: Math.round(clampedValue),
          history: newHistory,
          status: clampedValue >= metric.threshold.critical ? 'critical' :
                  clampedValue >= metric.threshold.warning ? 'warning' : 'good'
        };
      }));

      // Update server health data
      setServerHealth(prev => prev.map(server => ({
        ...server,
        lastHeartbeat: server.status === 'online' ? new Date() : server.lastHeartbeat,
        performanceScore: server.status === 'online' ?
          Math.max(60, Math.min(100, server.performanceScore + (Math.random() - 0.5) * 10)) : 0
      })));

      setRefreshing(false);
    }, 1500);
  };

  const handleServerDrillDown = (server: ServerHealth) => {
    setSelectedServer(server);
    setShowServerDetails(true);
  };

  const handleMetricDrillDown = (metric: SystemMetric) => {
    // Navigate to detailed metric view
    console.log('Drill down into metric:', metric.name);
  };

  const getOverallHealth = () => {
    const criticalCount = systemMetrics.filter(m => m.status === 'critical').length;
    const warningCount = systemMetrics.filter(m => m.status === 'warning').length;

    if (criticalCount > 0) return { status: 'critical', text: 'Critical Issues Detected' };
    if (warningCount > 0) return { status: 'warning', text: 'Some Issues Detected' };
    return { status: 'good', text: 'All Systems Operational' };
  };

  const overallHealth = getOverallHealth();

  return (
    <LinearGradient
      colors={['#0A0A0A', '#1A1A1A', '#0A0A0A']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header with Controls */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Infrastructure Health</Text>
            <Text style={styles.headerSubtitle}>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </Text>
          </View>
          <View style={styles.headerControls}>
            <TouchableOpacity
              style={[styles.autoRefreshButton, autoRefresh && styles.autoRefreshActive]}
              onPress={() => setAutoRefresh(!autoRefresh)}
            >
              <Icon name="autorenew" size={20} color={autoRefresh ? "#000" : "#00FF88"} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
              <Icon name="refresh" size={20} color="#00FF88" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Time Range Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeRangeContainer}>
          <View style={styles.timeRangeSelector}>
            {timeRanges.map((range) => (
              <TouchableOpacity
                key={range.key}
                style={[
                  styles.timeRangeButton,
                  selectedTimeRange === range.key && styles.timeRangeButtonActive
                ]}
                onPress={() => setSelectedTimeRange(range.key)}
              >
                <Text style={[
                  styles.timeRangeText,
                  selectedTimeRange === range.key && styles.timeRangeTextActive
                ]}>
                  {range.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#00FF88"
              colors={['#00FF88']}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* System Overview Cards */}
          <View style={styles.overviewSection}>
            <Text style={styles.sectionTitle}>System Overview</Text>
            <View style={styles.overviewGrid}>
              <View style={styles.overviewCard}>
                <Icon name="dns" size={24} color="#00FF88" />
                <Text style={styles.overviewValue}>{overview.onlineServers}/{overview.totalServers}</Text>
                <Text style={styles.overviewLabel}>Servers Online</Text>
              </View>

              <View style={styles.overviewCard}>
                <Icon name="error" size={24} color="#FF3366" />
                <Text style={[styles.overviewValue, { color: '#FF3366' }]}>{overview.criticalAlerts}</Text>
                <Text style={styles.overviewLabel}>Critical Alerts</Text>
              </View>

              <View style={styles.overviewCard}>
                <Icon name="warning" size={24} color="#FFA500" />
                <Text style={[styles.overviewValue, { color: '#FFA500' }]}>{overview.warningAlerts}</Text>
                <Text style={styles.overviewLabel}>Warning Alerts</Text>
              </View>

              <View style={styles.overviewCard}>
                <Icon name="speed" size={24} color={getPerformanceScoreColor(overview.systemPerformanceScore)} />
                <Text style={[styles.overviewValue, { color: getPerformanceScoreColor(overview.systemPerformanceScore) }]}>
                  {overview.systemPerformanceScore}
                </Text>
                <Text style={styles.overviewLabel}>Performance Score</Text>
              </View>
            </View>
          </View>

          {/* Overall Health Status */}
          <View style={styles.healthOverview}>
            <View style={styles.healthHeader}>
              <Icon
                name="health-and-safety"
                size={32}
                color={getStatusColor(overallHealth.status)}
              />
              <View style={styles.healthInfo}>
                <Text style={styles.healthTitle}>System Health</Text>
                <Text style={[styles.healthStatus, { color: getStatusColor(overallHealth.status) }]}>
                  {overallHealth.text}
                </Text>
              </View>
              <View style={styles.networkUtilization}>
                <Text style={styles.networkLabel}>Network Utilization</Text>
                <View style={styles.networkBar}>
                  <View
                    style={[
                      styles.networkFill,
                      {
                        width: `${overview.networkUtilization}%`,
                        backgroundColor: overview.networkUtilization > 80 ? '#FF3366' : '#00FF88'
                      }
                    ]}
                  />
                </View>
                <Text style={styles.networkValue}>{overview.networkUtilization}%</Text>
              </View>
            </View>
          </View>

          {/* Real-Time Metrics Visualization */}
          <View style={styles.metricsSection}>
            <Text style={styles.sectionTitle}>Real-Time Metrics</Text>
            <View style={styles.metricsGrid}>
              {systemMetrics.map((metric) => (
                <TouchableOpacity
                  key={metric.id}
                  style={styles.metricCard}
                  onPress={() => handleMetricDrillDown(metric)}
                >
                  <View style={styles.metricHeader}>
                    <Text style={styles.metricName}>{metric.name}</Text>
                    <Icon
                      name={getTrendIcon(metric.trend)}
                      size={16}
                      color={getTrendColor(metric.trend)}
                    />
                  </View>

                  <View style={styles.metricValue}>
                    <Text style={[styles.metricNumber, { color: getStatusColor(metric.status) }]}>
                      {metric.value}
                    </Text>
                    <Text style={styles.metricUnit}>{metric.unit}</Text>
                  </View>

                  {/* Mini Chart */}
                  <View style={styles.miniChart}>
                    {metric.history.map((value, index) => (
                      <View
                        key={index}
                        style={[
                          styles.chartBar,
                          {
                            height: `${(value / Math.max(...metric.history)) * 100}%`,
                            backgroundColor: getStatusColor(metric.status),
                            opacity: 0.3 + (index / metric.history.length) * 0.7
                          }
                        ]}
                      />
                    ))}
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(metric.value, 100)}%`,
                          backgroundColor: getStatusColor(metric.status)
                        }
                      ]}
                    />
                  </View>

                  <Text style={[styles.metricStatus, { color: getStatusColor(metric.status) }]}>
                    {metric.status.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Server Health Status */}
          <View style={styles.serverHealthSection}>
            <Text style={styles.sectionTitle}>Server Health Status</Text>
            {serverHealth.map((server) => (
              <TouchableOpacity
                key={server.id}
                style={styles.serverHealthCard}
                onPress={() => handleServerDrillDown(server)}
              >
                <View style={styles.serverHealthHeader}>
                  <View style={styles.serverBasicInfo}>
                    <Icon
                      name={server.status === 'online' ? 'check-circle' :
                            server.status === 'maintenance' ? 'build' : 'error'}
                      size={20}
                      color={getStatusColor(server.status)}
                    />
                    <View style={styles.serverNameInfo}>
                      <Text style={styles.serverHealthName}>{server.name}</Text>
                      <Text style={styles.serverHealthStatus}>
                        {server.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.serverScoreContainer}>
                    <Text style={styles.serverScoreLabel}>Performance</Text>
                    <Text style={[
                      styles.serverScore,
                      { color: getPerformanceScoreColor(server.performanceScore) }
                    ]}>
                      {server.performanceScore}
                    </Text>
                  </View>
                </View>

                <View style={styles.serverMetricsRow}>
                  <View style={styles.serverMetricItem}>
                    <Text style={styles.serverMetricLabel}>CPU</Text>
                    <Text style={styles.serverMetricValue}>{server.metrics.cpu.current}%</Text>
                    <View style={styles.serverMetricBar}>
                      <View
                        style={[
                          styles.serverMetricFill,
                          {
                            width: `${server.metrics.cpu.current}%`,
                            backgroundColor: server.metrics.cpu.current > 80 ? '#FF3366' : '#00FF88'
                          }
                        ]}
                      />
                    </View>
                  </View>

                  <View style={styles.serverMetricItem}>
                    <Text style={styles.serverMetricLabel}>Memory</Text>
                    <Text style={styles.serverMetricValue}>{server.metrics.memory.used}%</Text>
                    <View style={styles.serverMetricBar}>
                      <View
                        style={[
                          styles.serverMetricFill,
                          {
                            width: `${server.metrics.memory.used}%`,
                            backgroundColor: server.metrics.memory.used > 80 ? '#FF3366' : '#00FF88'
                          }
                        ]}
                      />
                    </View>
                  </View>

                  <View style={styles.serverMetricItem}>
                    <Text style={styles.serverMetricLabel}>Disk</Text>
                    <Text style={styles.serverMetricValue}>{server.metrics.disk.usage}%</Text>
                    <View style={styles.serverMetricBar}>
                      <View
                        style={[
                          styles.serverMetricFill,
                          {
                            width: `${server.metrics.disk.usage}%`,
                            backgroundColor: server.metrics.disk.usage > 80 ? '#FF3366' : '#00FF88'
                          }
                        ]}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.serverFooterInfo}>
                  <View style={styles.heartbeatInfo}>
                    <Icon
                      name={server.agentConnected ? "wifi" : "wifi-off"}
                      size={14}
                      color={server.agentConnected ? "#00FF88" : "#FF3366"}
                    />
                    <Text style={styles.heartbeatText}>
                      {server.agentConnected ? 'Agent Connected' : 'Agent Disconnected'}
                    </Text>
                  </View>
                  <Text style={styles.lastHeartbeat}>
                    Last heartbeat: {formatLastHeartbeat(server.lastHeartbeat)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Infrastructure Topology Preview */}
          <View style={styles.topologySection}>
            <Text style={styles.sectionTitle}>Infrastructure Topology</Text>
            <View style={styles.topologyPreview}>
              <View style={styles.topologyNode}>
                <Icon name="router" size={24} color="#00FF88" />
                <Text style={styles.topologyNodeLabel}>Load Balancer</Text>
              </View>
              <View style={styles.topologyConnection} />
              <View style={styles.topologyNode}>
                <Icon name="dns" size={24} color="#00FF88" />
                <Text style={styles.topologyNodeLabel}>Web Servers</Text>
              </View>
              <View style={styles.topologyConnection} />
              <View style={styles.topologyNode}>
                <Icon name="storage" size={24} color="#00FF88" />
                <Text style={styles.topologyNodeLabel}>Database</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.viewTopologyButton}>
              <Text style={styles.viewTopologyText}>View Full Topology</Text>
              <Icon name="arrow-forward" size={16} color="#00FF88" />
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={onRefresh}>
              <Icon name="refresh" size={20} color="#00FF88" />
              <Text style={styles.actionButtonText}>Refresh All</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Icon name="settings" size={20} color="#00FF88" />
              <Text style={styles.actionButtonText}>Configure</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Icon name="timeline" size={20} color="#00FF88" />
              <Text style={styles.actionButtonText}>View Trends</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Server Details Modal */}
        <Modal
          visible={showServerDetails}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowServerDetails(false)}
        >
          <LinearGradient
            colors={['#0A0A0A', '#1A1A1A', '#0A0A0A']}
            style={styles.modalContainer}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setShowServerDetails(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="close" size={24} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {selectedServer?.name} Details
              </Text>
              <View style={styles.modalHeaderSpacer} />
            </View>

            {selectedServer && (
              <ScrollView style={styles.modalContent}>
                <View style={styles.serverDetailSection}>
                  <Text style={styles.serverDetailTitle}>Performance Metrics</Text>
                  <View style={styles.serverDetailGrid}>
                    <View style={styles.serverDetailCard}>
                      <Text style={styles.serverDetailLabel}>CPU Usage</Text>
                      <Text style={styles.serverDetailValue}>
                        Current: {selectedServer.metrics.cpu.current}%
                      </Text>
                      <Text style={styles.serverDetailSubValue}>
                        Avg: {selectedServer.metrics.cpu.average}% | Peak: {selectedServer.metrics.cpu.peak}%
                      </Text>
                    </View>

                    <View style={styles.serverDetailCard}>
                      <Text style={styles.serverDetailLabel}>Memory Usage</Text>
                      <Text style={styles.serverDetailValue}>
                        Used: {selectedServer.metrics.memory.used}%
                      </Text>
                      <Text style={styles.serverDetailSubValue}>
                        Available: {selectedServer.metrics.memory.available}% | Swap: {selectedServer.metrics.memory.swap}%
                      </Text>
                    </View>

                    <View style={styles.serverDetailCard}>
                      <Text style={styles.serverDetailLabel}>Network Stats</Text>
                      <Text style={styles.serverDetailValue}>
                        Bandwidth: {selectedServer.metrics.network.bandwidth} MB/s
                      </Text>
                      <Text style={styles.serverDetailSubValue}>
                        Packets: {selectedServer.metrics.network.packets} | Errors: {selectedServer.metrics.network.errors}
                      </Text>
                    </View>
                  </View>
                </View>
              </ScrollView>
            )}
          </LinearGradient>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  autoRefreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#00FF88',
  },
  autoRefreshActive: {
    backgroundColor: '#00FF88',
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00FF88',
  },
  timeRangeContainer: {
    marginBottom: 8,
  },
  timeRangeSelector: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  timeRangeButton: {
    backgroundColor: '#1A1A1A',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  timeRangeButtonActive: {
    backgroundColor: '#00FF88',
    borderColor: '#00FF88',
  },
  timeRangeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  timeRangeTextActive: {
    color: '#000',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 16,
    marginTop: 8,
  },
  overviewSection: {
    marginBottom: 20,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  overviewCard: {
    width: '48%',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  overviewValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00FF88',
    marginVertical: 8,
  },
  overviewLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  healthOverview: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  healthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  healthInfo: {
    marginLeft: 16,
    flex: 1,
  },
  healthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  healthStatus: {
    fontSize: 16,
    fontWeight: '600',
  },
  networkUtilization: {
    alignItems: 'center',
    minWidth: 80,
  },
  networkLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 4,
  },
  networkBar: {
    width: 60,
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    marginBottom: 4,
  },
  networkFill: {
    height: '100%',
    borderRadius: 3,
  },
  networkValue: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: 'bold',
  },
  metricsSection: {
    marginBottom: 20,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricName: {
    fontSize: 13,
    color: '#FFF',
    fontWeight: '600',
  },
  metricValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  metricNumber: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  metricUnit: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  miniChart: {
    flexDirection: 'row',
    alignItems: 'end',
    height: 30,
    marginBottom: 8,
  },
  chartBar: {
    flex: 1,
    marginHorizontal: 1,
    borderRadius: 1,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  metricStatus: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  serverHealthSection: {
    marginBottom: 20,
  },
  serverHealthCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  serverHealthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  serverBasicInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  serverNameInfo: {
    marginLeft: 12,
  },
  serverHealthName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 2,
  },
  serverHealthStatus: {
    fontSize: 12,
    color: '#666',
  },
  serverScoreContainer: {
    alignItems: 'center',
  },
  serverScoreLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  serverScore: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  serverMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  serverMetricItem: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  serverMetricLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 4,
  },
  serverMetricValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  serverMetricBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
  },
  serverMetricFill: {
    height: '100%',
    borderRadius: 2,
  },
  serverFooterInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heartbeatInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heartbeatText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 4,
  },
  lastHeartbeat: {
    fontSize: 11,
    color: '#666',
  },
  topologySection: {
    marginBottom: 20,
  },
  topologyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
  },
  topologyNode: {
    alignItems: 'center',
  },
  topologyNodeLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
  },
  topologyConnection: {
    width: 30,
    height: 2,
    backgroundColor: '#00FF88',
    marginHorizontal: 10,
  },
  viewTopologyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  viewTopologyText: {
    color: '#00FF88',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00FF88',
  },
  actionButtonText: {
    color: '#00FF88',
    marginLeft: 6,
    fontWeight: '600',
    fontSize: 12,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  modalHeaderSpacer: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  serverDetailSection: {
    marginBottom: 20,
  },
  serverDetailTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00FF88',
    marginBottom: 12,
  },
  serverDetailGrid: {
    gap: 12,
  },
  serverDetailCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  serverDetailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  serverDetailValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 2,
  },
  serverDetailSubValue: {
    fontSize: 12,
    color: '#666',
  },
});

export default InfraHealthDashboardScreen;
