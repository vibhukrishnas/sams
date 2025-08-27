import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const InfraHealthDashboardScreen: React.FC = () => {
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  }, []);

  const healthMetrics = [
    { title: 'System Uptime', value: '99.8%', status: 'good', icon: 'schedule' },
    { title: 'Average Response Time', value: '125ms', status: 'good', icon: 'speed' },
    { title: 'Error Rate', value: '0.2%', status: 'good', icon: 'error-outline' },
    { title: 'Active Users', value: '1,247', status: 'good', icon: 'people' },
  ];

  const services = [
    { name: 'API Gateway', status: 'healthy', uptime: '99.9%', lastCheck: '2 mins ago' },
    { name: 'Database Cluster', status: 'healthy', uptime: '99.7%', lastCheck: '1 min ago' },
    { name: 'Authentication Service', status: 'healthy', uptime: '99.8%', lastCheck: '30 secs ago' },
    { name: 'File Storage Service', status: 'warning', uptime: '98.5%', lastCheck: '5 mins ago' },
    { name: 'Notification Service', status: 'healthy', uptime: '99.6%', lastCheck: '1 min ago' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'good':
        return '#27ae60';
      case 'warning':
        return '#f39c12';
      case 'critical':
        return '#e74c3c';
      default:
        return '#95a5a6';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'good':
        return 'check-circle';
      case 'warning':
        return 'warning';
      case 'critical':
        return 'error';
      default:
        return 'help';
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Infrastructure Health</Text>
        <Text style={styles.subtitle}>Real-time system monitoring</Text>
      </View>

      <View style={styles.overallHealthContainer}>
        <View style={styles.overallHealthCard}>
          <MaterialIcons name="favorite" size={32} color="#27ae60" />
          <Text style={styles.overallHealthTitle}>System Health</Text>
          <Text style={styles.overallHealthStatus}>EXCELLENT</Text>
          <Text style={styles.overallHealthScore}>97.8%</Text>
        </View>
      </View>

      <View style={styles.metricsGrid}>
        {healthMetrics.map((metric, index) => (
          <View key={index} style={styles.metricCard}>
            <MaterialIcons 
              name={metric.icon as any} 
              size={24} 
              color={getStatusColor(metric.status)} 
            />
            <Text style={styles.metricValue}>{metric.value}</Text>
            <Text style={styles.metricTitle}>{metric.title}</Text>
          </View>
        ))}
      </View>

      <View style={styles.servicesContainer}>
        <Text style={styles.servicesTitle}>Service Status</Text>
        {services.map((service, index) => (
          <View key={index} style={styles.serviceCard}>
            <View style={styles.serviceHeader}>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.serviceUptime}>Uptime: {service.uptime}</Text>
              </View>
              <View style={styles.serviceStatusContainer}>
                <MaterialIcons 
                  name={getStatusIcon(service.status)} 
                  size={20} 
                  color={getStatusColor(service.status)} 
                />
                <Text style={[styles.serviceStatus, { color: getStatusColor(service.status) }]}>
                  {service.status.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={styles.lastCheck}>Last checked: {service.lastCheck}</Text>
          </View>
        ))}
      </View>

      <View style={styles.alertsContainer}>
        <Text style={styles.alertsTitle}>Recent Alerts</Text>
        <View style={styles.alertCard}>
          <MaterialIcons name="warning" size={20} color="#f39c12" />
          <View style={styles.alertContent}>
            <Text style={styles.alertText}>File Storage Service - High latency detected</Text>
            <Text style={styles.alertTime}>5 minutes ago</Text>
          </View>
        </View>
        <View style={styles.alertCard}>
          <MaterialIcons name="info" size={20} color="#3498db" />
          <View style={styles.alertContent}>
            <Text style={styles.alertText}>Scheduled maintenance completed successfully</Text>
            <Text style={styles.alertTime}>2 hours ago</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  overallHealthContainer: {
    padding: 20,
  },
  overallHealthCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  overallHealthTitle: {
    fontSize: 18,
    color: '#2c3e50',
    marginTop: 10,
  },
  overallHealthStatus: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#27ae60',
    marginTop: 5,
  },
  overallHealthScore: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#27ae60',
    marginTop: 10,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  metricCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    width: (width - 60) / 2,
    marginHorizontal: 5,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginVertical: 5,
  },
  metricTitle: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  servicesContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  servicesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  serviceCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  serviceUptime: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  serviceStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  lastCheck: {
    fontSize: 12,
    color: '#95a5a6',
    fontStyle: 'italic',
  },
  alertsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  alertsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  alertCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertContent: {
    flex: 1,
    marginLeft: 15,
  },
  alertText: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 2,
  },
  alertTime: {
    fontSize: 12,
    color: '#7f8c8d',
  },
});

export default InfraHealthDashboardScreen;
