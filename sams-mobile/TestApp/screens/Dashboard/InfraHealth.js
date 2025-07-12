import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const InfraHealth = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [healthData, setHealthData] = useState({
    cpu: {usage: 45, status: 'healthy'},
    memory: {usage: 78, status: 'warning'},
    disk: {usage: 32, status: 'healthy'},
    network: {usage: 23, status: 'healthy'},
    uptime: '15 days, 8 hours',
    lastUpdate: new Date().toLocaleString(),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setHealthData({
        cpu: {usage: Math.floor(Math.random() * 100), status: 'healthy'},
        memory: {usage: Math.floor(Math.random() * 100), status: 'warning'},
        disk: {usage: Math.floor(Math.random() * 100), status: 'healthy'},
        network: {usage: Math.floor(Math.random() * 100), status: 'healthy'},
        uptime: '15 days, 8 hours',
        lastUpdate: new Date().toLocaleString(),
      });
      setRefreshing(false);
    }, 1000);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return '#059669';
      case 'warning':
        return '#ea580c';
      case 'critical':
        return '#dc2626';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return 'check-circle';
      case 'warning':
        return 'warning';
      case 'critical':
        return 'error';
      default:
        return 'help';
    }
  };

  const renderMetricCard = (title, metric, icon, color) => (
    <View style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <Icon name={icon} size={24} color={color} />
        <Text style={styles.metricTitle}>{title}</Text>
      </View>
      <View style={styles.metricValue}>
        <Text style={[styles.metricNumber, {color}]}>{metric.usage}%</Text>
        <View style={styles.statusIndicator}>
          <Icon
            name={getStatusIcon(metric.status)}
            size={16}
            color={getStatusColor(metric.status)}
          />
          <Text style={[styles.statusText, {color: getStatusColor(metric.status)}]}>
            {metric.status}
          </Text>
        </View>
      </View>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${metric.usage}%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Infrastructure Health</Text>
        <Text style={styles.lastUpdate}>Last updated: {healthData.lastUpdate}</Text>
      </View>

      {/* System Uptime */}
      <View style={styles.section}>
        <View style={styles.uptimeCard}>
          <Icon name="schedule" size={32} color="#1e3a8a" />
          <View style={styles.uptimeInfo}>
            <Text style={styles.uptimeLabel}>System Uptime</Text>
            <Text style={styles.uptimeValue}>{healthData.uptime}</Text>
          </View>
        </View>
      </View>

      {/* System Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System Metrics</Text>
        {renderMetricCard('CPU Usage', healthData.cpu, 'memory', '#1e3a8a')}
        {renderMetricCard('Memory Usage', healthData.memory, 'storage', '#059669')}
        {renderMetricCard('Disk Usage', healthData.disk, 'hard-drive', '#ea580c')}
        {renderMetricCard('Network Usage', healthData.network, 'wifi', '#7c3aed')}
      </View>

      {/* Health Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Health Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Icon name="check-circle" size={32} color="#059669" />
            <Text style={styles.summaryNumber}>3</Text>
            <Text style={styles.summaryLabel}>Healthy</Text>
          </View>
          <View style={styles.summaryCard}>
            <Icon name="warning" size={32} color="#ea580c" />
            <Text style={styles.summaryNumber}>1</Text>
            <Text style={styles.summaryLabel}>Warning</Text>
          </View>
          <View style={styles.summaryCard}>
            <Icon name="error" size={32} color="#dc2626" />
            <Text style={styles.summaryNumber}>0</Text>
            <Text style={styles.summaryLabel}>Critical</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard}>
            <Icon name="refresh" size={24} color="#1e3a8a" />
            <Text style={styles.actionText}>Refresh Data</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard}>
            <Icon name="assessment" size={24} color="#059669" />
            <Text style={styles.actionText}>Generate Report</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard}>
            <Icon name="settings" size={24} color="#ea580c" />
            <Text style={styles.actionText}>Configure Alerts</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard}>
            <Icon name="history" size={24} color="#7c3aed" />
            <Text style={styles.actionText}>View History</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  lastUpdate: {
    fontSize: 14,
    color: '#6b7280',
  },
  section: {
    margin: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  uptimeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  uptimeInfo: {
    marginLeft: 16,
  },
  uptimeLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  uptimeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  metricCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
  },
  metricValue: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default InfraHealth; 