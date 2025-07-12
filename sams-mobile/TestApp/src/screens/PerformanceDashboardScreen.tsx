/**
 * 📊 Performance Dashboard Screen
 * Comprehensive performance monitoring and scalability metrics
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import PerformanceMonitor from '../services/PerformanceMonitor';

const { width } = Dimensions.get('window');

interface PerformanceTarget {
  name: string;
  target: number;
  current: number;
  unit: string;
  status: 'met' | 'warning' | 'critical';
  description: string;
}

interface ScalabilityMetric {
  id: string;
  component: string;
  currentLoad: number;
  maxCapacity: number;
  utilizationPercent: number;
  autoScalingEnabled: boolean;
  lastScaleEvent?: Date;
  scaleDirection?: 'up' | 'down';
}

interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical';
  uptime: number;
  responseTime: number;
  throughput: number;
  errorRate: number;
  lastUpdate: Date;
}

const PerformanceDashboardScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'targets' | 'scalability' | 'health' | 'metrics'>('targets');
  const [performanceTargets, setPerformanceTargets] = useState<PerformanceTarget[]>([]);
  const [scalabilityMetrics, setScalabilityMetrics] = useState<ScalabilityMetric[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  const performanceMonitor = PerformanceMonitor.getInstance();

  useEffect(() => {
    loadPerformanceData();
    
    const interval = setInterval(loadPerformanceData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadPerformanceData = () => {
    const report = performanceMonitor.getPerformanceReport();
    setPerformanceTargets(report.targets);
    setScalabilityMetrics(report.scalability);
    setSystemHealth(report.health);
    setRecommendations(report.recommendations);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    loadPerformanceData();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'met':
      case 'healthy': return '#00FF88';
      case 'warning': return '#FFA500';
      case 'critical': return '#FF3366';
      default: return '#666';
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 80) return '#FF3366';
    if (utilization >= 60) return '#FFA500';
    return '#00FF88';
  };

  const formatNumber = (num: number, decimals: number = 1) => {
    return num.toFixed(decimals);
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    return date.toLocaleTimeString();
  };

  const renderPerformanceTargets = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Performance Targets</Text>
      <Text style={styles.sectionSubtitle}>
        System performance against defined SLA targets
      </Text>

      {performanceTargets.map((target, index) => (
        <View key={index} style={styles.targetCard}>
          <View style={styles.targetHeader}>
            <Text style={styles.targetName}>{target.name}</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(target.status) + '20' }
            ]}>
              <Text style={[styles.statusText, { color: getStatusColor(target.status) }]}>
                {target.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={styles.targetDescription}>{target.description}</Text>

          <View style={styles.targetMetrics}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Current</Text>
              <Text style={[styles.metricValue, { color: getStatusColor(target.status) }]}>
                {formatNumber(target.current)} {target.unit}
              </Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Target</Text>
              <Text style={styles.metricValue}>
                {target.target} {target.unit}
              </Text>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[
                styles.progressFill,
                {
                  width: target.name === 'System Uptime' 
                    ? `${(target.current / 100) * 100}%`
                    : `${Math.min((target.target / target.current) * 100, 100)}%`,
                  backgroundColor: getStatusColor(target.status)
                }
              ]} />
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const renderScalabilityMetrics = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Scalability Metrics</Text>
      <Text style={styles.sectionSubtitle}>
        Component utilization and auto-scaling status
      </Text>

      {scalabilityMetrics.map((metric) => (
        <View key={metric.id} style={styles.scalabilityCard}>
          <View style={styles.scalabilityHeader}>
            <Text style={styles.componentName}>{metric.component}</Text>
            <View style={styles.scalabilityStatus}>
              {metric.autoScalingEnabled && (
                <View style={styles.autoScaleBadge}>
                  <Icon name="trending-up" size={12} color="#00FF88" />
                  <Text style={styles.autoScaleText}>AUTO</Text>
                </View>
              )}
              {metric.lastScaleEvent && (
                <View style={[
                  styles.scaleEventBadge,
                  { backgroundColor: metric.scaleDirection === 'up' ? '#00FF88' : '#FFA500' }
                ]}>
                  <Icon 
                    name={metric.scaleDirection === 'up' ? 'arrow-upward' : 'arrow-downward'} 
                    size={12} 
                    color="#000" 
                  />
                </View>
              )}
            </View>
          </View>

          <View style={styles.utilizationContainer}>
            <Text style={styles.utilizationLabel}>
              Utilization: {formatNumber(metric.utilizationPercent)}%
            </Text>
            <View style={styles.utilizationBar}>
              <View style={[
                styles.utilizationFill,
                {
                  width: `${metric.utilizationPercent}%`,
                  backgroundColor: getUtilizationColor(metric.utilizationPercent)
                }
              ]} />
            </View>
          </View>

          <View style={styles.capacityMetrics}>
            <View style={styles.capacityItem}>
              <Text style={styles.capacityLabel}>Current Load</Text>
              <Text style={styles.capacityValue}>
                {metric.currentLoad.toLocaleString()}
              </Text>
            </View>
            <View style={styles.capacityItem}>
              <Text style={styles.capacityLabel}>Max Capacity</Text>
              <Text style={styles.capacityValue}>
                {metric.maxCapacity.toLocaleString()}
              </Text>
            </View>
          </View>

          {metric.lastScaleEvent && (
            <Text style={styles.lastScaleText}>
              Last scaled {metric.scaleDirection} {formatTimestamp(metric.lastScaleEvent)}
            </Text>
          )}
        </View>
      ))}
    </ScrollView>
  );

  const renderSystemHealth = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>System Health</Text>
      <Text style={styles.sectionSubtitle}>
        Overall system status and key performance indicators
      </Text>

      {systemHealth && (
        <>
          <View style={styles.healthOverview}>
            <View style={[
              styles.healthCard,
              { borderLeftColor: getStatusColor(systemHealth.overall) }
            ]}>
              <Icon 
                name={systemHealth.overall === 'healthy' ? 'check-circle' : 
                      systemHealth.overall === 'warning' ? 'warning' : 'error'} 
                size={32} 
                color={getStatusColor(systemHealth.overall)} 
              />
              <Text style={styles.healthStatus}>
                {systemHealth.overall.toUpperCase()}
              </Text>
              <Text style={styles.healthSubtext}>
                System Status
              </Text>
            </View>
          </View>

          <View style={styles.healthMetrics}>
            <View style={styles.healthMetricCard}>
              <Text style={styles.healthMetricValue}>
                {formatNumber(systemHealth.uptime, 2)}%
              </Text>
              <Text style={styles.healthMetricLabel}>Uptime</Text>
              <Icon name="schedule" size={16} color="#00FF88" />
            </View>

            <View style={styles.healthMetricCard}>
              <Text style={styles.healthMetricValue}>
                {formatNumber(systemHealth.responseTime)}ms
              </Text>
              <Text style={styles.healthMetricLabel}>Response Time</Text>
              <Icon name="speed" size={16} color="#00BFFF" />
            </View>

            <View style={styles.healthMetricCard}>
              <Text style={styles.healthMetricValue}>
                {systemHealth.throughput.toLocaleString()}
              </Text>
              <Text style={styles.healthMetricLabel}>Throughput/min</Text>
              <Icon name="trending-up" size={16} color="#9C27B0" />
            </View>

            <View style={styles.healthMetricCard}>
              <Text style={styles.healthMetricValue}>
                {formatNumber(systemHealth.errorRate, 3)}%
              </Text>
              <Text style={styles.healthMetricLabel}>Error Rate</Text>
              <Icon name="error-outline" size={16} color="#FF6B35" />
            </View>
          </View>

          <View style={styles.recommendationsSection}>
            <Text style={styles.recommendationsTitle}>Recommendations</Text>
            {recommendations.map((recommendation, index) => (
              <View key={index} style={styles.recommendationItem}>
                <Icon 
                  name={recommendation.startsWith('Critical') ? 'error' :
                        recommendation.startsWith('Warning') ? 'warning' :
                        recommendation.startsWith('Consider') ? 'info' : 'check-circle'} 
                  size={16} 
                  color={recommendation.startsWith('Critical') ? '#FF3366' :
                        recommendation.startsWith('Warning') ? '#FFA500' :
                        recommendation.startsWith('Consider') ? '#00BFFF' : '#00FF88'} 
                />
                <Text style={styles.recommendationText}>{recommendation}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.lastUpdateText}>
            Last updated: {formatTimestamp(systemHealth.lastUpdate)}
          </Text>
        </>
      )}
    </ScrollView>
  );

  return (
    <LinearGradient
      colors={['#0A0A0A', '#1A1A1A', '#0A0A0A']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Performance & Scalability</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Icon name="refresh" size={24} color="#00FF88" />
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          {[
            { key: 'targets', label: 'Targets', icon: 'track-changes' },
            { key: 'scalability', label: 'Scale', icon: 'trending-up' },
            { key: 'health', label: 'Health', icon: 'favorite' },
            { key: 'metrics', label: 'Metrics', icon: 'analytics' }
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key as any)}
            >
              <Icon name={tab.icon} size={16} color={activeTab === tab.key ? "#000" : "#FFF"} />
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {activeTab === 'targets' && renderPerformanceTargets()}
          {activeTab === 'scalability' && renderScalabilityMetrics()}
          {activeTab === 'health' && renderSystemHealth()}
          {activeTab === 'metrics' && (
            <View style={styles.comingSoon}>
              <Icon name="analytics" size={64} color="#666" />
              <Text style={styles.comingSoonText}>Real-time Metrics</Text>
              <Text style={styles.comingSoonSubtext}>
                Advanced metrics visualization coming soon
              </Text>
            </View>
          )}
        </View>
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  refreshButton: {
    padding: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#00FF88',
  },
  tabText: {
    color: '#FFF',
    marginLeft: 4,
    fontSize: 11,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#000',
  },
  content: {
    flex: 1,
    marginTop: 16,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  targetCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  targetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  targetName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  targetDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  targetMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  scalabilityCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  scalabilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  componentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  scalabilityStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  autoScaleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A2A1A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 8,
  },
  autoScaleText: {
    fontSize: 10,
    color: '#00FF88',
    marginLeft: 2,
    fontWeight: 'bold',
  },
  scaleEventBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  utilizationContainer: {
    marginBottom: 12,
  },
  utilizationLabel: {
    fontSize: 14,
    color: '#FFF',
    marginBottom: 6,
    fontWeight: '600',
  },
  utilizationBar: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
  },
  utilizationFill: {
    height: '100%',
    borderRadius: 4,
  },
  capacityMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  capacityItem: {
    alignItems: 'center',
  },
  capacityLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  capacityValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
  },
  lastScaleText: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
  healthOverview: {
    alignItems: 'center',
    marginBottom: 20,
  },
  healthCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderLeftWidth: 4,
    width: '100%',
  },
  healthStatus: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 8,
  },
  healthSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  healthMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  healthMetricCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '48%',
    marginBottom: 8,
  },
  healthMetricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  healthMetricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  recommendationsSection: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 12,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 14,
    color: '#FFF',
    marginLeft: 8,
    flex: 1,
  },
  lastUpdateText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  comingSoon: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  comingSoonText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    fontWeight: '600',
  },
  comingSoonSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default PerformanceDashboardScreen;
