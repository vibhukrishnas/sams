import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const ServerManagementScreen: React.FC = () => {
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  }, []);

  const servers = [
    { name: 'SAMS-PROD-01', status: 'online', cpu: '45%', memory: '62%', ip: '192.168.1.10' },
    { name: 'SAMS-PROD-02', status: 'online', cpu: '38%', memory: '55%', ip: '192.168.1.11' },
    { name: 'SAMS-DB-01', status: 'online', cpu: '72%', memory: '78%', ip: '192.168.1.20' },
    { name: 'SAMS-BACKUP-01', status: 'warning', cpu: '25%', memory: '45%', ip: '192.168.1.30' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#27ae60';
      case 'warning': return '#f39c12';
      case 'offline': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return 'check-circle';
      case 'warning': return 'warning';
      case 'offline': return 'error';
      default: return 'help';
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
        <Text style={styles.title}>Server Management</Text>
        <Text style={styles.subtitle}>Monitor and manage SAMS servers</Text>
      </View>

      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <MaterialIcons name="computer" size={24} color="#4a90e2" />
          <Text style={styles.summaryNumber}>4</Text>
          <Text style={styles.summaryLabel}>Total Servers</Text>
        </View>
        <View style={styles.summaryCard}>
          <MaterialIcons name="check-circle" size={24} color="#27ae60" />
          <Text style={styles.summaryNumber}>3</Text>
          <Text style={styles.summaryLabel}>Online</Text>
        </View>
        <View style={styles.summaryCard}>
          <MaterialIcons name="warning" size={24} color="#f39c12" />
          <Text style={styles.summaryNumber}>1</Text>
          <Text style={styles.summaryLabel}>Warnings</Text>
        </View>
      </View>

      {servers.map((server, index) => (
        <TouchableOpacity key={index} style={styles.serverCard}>
          <View style={styles.serverHeader}>
            <View style={styles.serverInfo}>
              <Text style={styles.serverName}>{server.name}</Text>
              <Text style={styles.serverIP}>{server.ip}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(server.status) }]}>
              <MaterialIcons 
                name={getStatusIcon(server.status)} 
                size={16} 
                color="white" 
              />
              <Text style={styles.statusText}>{server.status.toUpperCase()}</Text>
            </View>
          </View>
          
          <View style={styles.metricsContainer}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>CPU Usage</Text>
              <Text style={styles.metricValue}>{server.cpu}</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Memory Usage</Text>
              <Text style={styles.metricValue}>{server.memory}</Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

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
  summaryContainer: {
    flexDirection: 'row',
    padding: 20,
    justifyContent: 'space-between',
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginVertical: 5,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  serverCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  serverInfo: {
    flex: 1,
  },
  serverName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  serverIP: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metric: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 5,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4a90e2',
  },
});

export default ServerManagementScreen;
