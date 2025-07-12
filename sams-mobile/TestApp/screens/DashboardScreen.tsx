import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator
} from 'react-native';
import RealCommandService from '../services/RealCommandService';

interface DashboardProps {
  servers: any[];
  alerts: any[];
  systemHealth: any;
}

const DashboardScreen: React.FC<DashboardProps> = ({ servers, alerts, systemHealth }) => {
  const screenWidth = Dimensions.get('window').width;
  const [isExecutingCommand, setIsExecutingCommand] = useState(false);
  const [lastCommandResult, setLastCommandResult] = useState<any>(null);

  useEffect(() => {
    // Initialize real command service
    RealCommandService.initialize();
  }, []);

  /**
   * 🔥 EXECUTE REAL SYSTEM COMMANDS
   */
  const executeRealCommand = async (commandId: string, commandName: string) => {
    try {
      setIsExecutingCommand(true);

      Alert.alert(
        '🔥 Execute Real Command',
        `Are you sure you want to execute: ${commandName}?\n\nThis will run ACTUAL system commands!`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Execute',
            style: 'destructive',
            onPress: async () => {
              console.log('🔥 EXECUTING REAL COMMAND:', commandName);

              const result = await RealCommandService.executeCommand(commandId);
              setLastCommandResult(result);

              Alert.alert(
                result.success ? '✅ Command Executed Successfully' : '❌ Command Failed',
                `Command: ${result.command}\n\nOutput: ${result.output.substring(0, 200)}${result.output.length > 200 ? '...' : ''}\n\nExecution Time: ${result.executionTime}ms`,
                [{ text: 'OK' }]
              );
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('❌ Error', `Failed to execute command: ${error.message}`);
    } finally {
      setIsExecutingCommand(false);
    }
  };

  // Calculate statistics
  const stats = {
    totalServers: servers.length,
    onlineServers: servers.filter(s => s.status === 'online' || s.status === 'Online').length,
    criticalAlerts: alerts.filter(a => a.severity === 'Critical' || a.severity === 'critical').length,
    avgHealth: servers.length > 0 
      ? Math.round(servers.reduce((sum, s) => sum + (s.health || 85), 0) / servers.length)
      : 0
  };

  const renderStatCard = (title: string, value: string | number, icon: string, color: string) => (
    <View style={[styles.statCard, { backgroundColor: color }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  const renderQuickAction = (title: string, icon: string, onPress: () => void) => (
    <TouchableOpacity style={styles.actionCard} onPress={onPress}>
      <Text style={styles.actionIcon}>{icon}</Text>
      <Text style={styles.actionTitle}>{title}</Text>
    </TouchableOpacity>
  );

  const renderServerCard = (server: any) => (
    <View key={server.id} style={styles.serverCard}>
      <View style={styles.serverHeader}>
        <Text style={styles.serverName}>{server.name}</Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: server.status === 'online' ? '#10b981' : '#ef4444' }
        ]}>
          <Text style={styles.statusText}>
            {server.status === 'online' ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>
      
      <View style={styles.serverMetrics}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>CPU</Text>
          <Text style={styles.metricValue}>{server.cpu || 0}%</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Memory</Text>
          <Text style={styles.metricValue}>{server.memory || 0}%</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Disk</Text>
          <Text style={styles.metricValue}>{server.disk || 0}%</Text>
        </View>
      </View>
    </View>
  );

  const renderAlertCard = (alert: any) => (
    <View key={alert.id} style={[
      styles.alertCard,
      { borderLeftColor: alert.severity === 'Critical' ? '#ef4444' : '#f59e0b' }
    ]}>
      <Text style={styles.alertTitle}>{alert.title}</Text>
      <Text style={styles.alertMessage}>{alert.message}</Text>
      <Text style={styles.alertTime}>
        {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : 'Just now'}
      </Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Statistics Cards */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System Overview</Text>
        <View style={styles.statsGrid}>
          {renderStatCard('Total Servers', stats.totalServers, '🖥️', '#3b82f6')}
          {renderStatCard('Online', stats.onlineServers, '✅', '#10b981')}
          {renderStatCard('Critical Alerts', stats.criticalAlerts, '🚨', '#ef4444')}
          {renderStatCard('Avg Health', `${stats.avgHealth}%`, '💚', '#8b5cf6')}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {renderQuickAction('🔥 Restart Servers', '🖥️', () => executeRealCommand('1', 'Restart Servers'))}
          {renderQuickAction('🔥 Clear Cache', '🧹', () => executeRealCommand('3', 'Clear Cache'))}
          {renderQuickAction('🔥 Check Disk Space', '💾', () => executeRealCommand('5', 'Check Disk Space'))}
          {renderQuickAction('🔥 Check Memory', '🧠', () => executeRealCommand('6', 'Check Memory'))}
          {renderQuickAction('🔥 Check CPU', '⚡', () => executeRealCommand('7', 'Check CPU'))}
          {renderQuickAction('🔥 List Services', '📋', () => executeRealCommand('8', 'List Services'))}
        </View>

        {/* Command Execution Status */}
        {isExecutingCommand && (
          <View style={styles.executionStatus}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.executionText}>🔥 Executing Real Command...</Text>
          </View>
        )}

        {/* Last Command Result */}
        {lastCommandResult && (
          <View style={styles.commandResult}>
            <Text style={styles.commandResultTitle}>
              {lastCommandResult.success ? '✅ Last Command: SUCCESS' : '❌ Last Command: FAILED'}
            </Text>
            <Text style={styles.commandResultText}>
              {lastCommandResult.command} ({lastCommandResult.executionTime}ms)
            </Text>
          </View>
        )}
      </View>

      {/* Server Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Server Status</Text>
        {servers.length > 0 ? (
          servers.slice(0, 3).map(renderServerCard)
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No servers configured</Text>
            <Text style={styles.emptySubtext}>Add servers to start monitoring</Text>
          </View>
        )}
      </View>

      {/* Recent Alerts */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Alerts</Text>
        {alerts.length > 0 ? (
          alerts.slice(0, 3).map(renderAlertCard)
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No recent alerts</Text>
            <Text style={styles.emptySubtext}>All systems running normally</Text>
          </View>
        )}
      </View>

      {/* System Health */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System Health</Text>
        <View style={styles.healthCard}>
          <View style={styles.healthMetric}>
            <Text style={styles.healthLabel}>CPU Usage</Text>
            <Text style={styles.healthValue}>{systemHealth.cpu_usage || 0}%</Text>
          </View>
          <View style={styles.healthMetric}>
            <Text style={styles.healthLabel}>Memory Usage</Text>
            <Text style={styles.healthValue}>{systemHealth.memory_usage || 0}%</Text>
          </View>
          <View style={styles.healthMetric}>
            <Text style={styles.healthLabel}>Disk Usage</Text>
            <Text style={styles.healthValue}>{systemHealth.disk_usage || 0}%</Text>
          </View>
          <View style={styles.healthMetric}>
            <Text style={styles.healthLabel}>Network</Text>
            <Text style={styles.healthValue}>
              {systemHealth.network_status === 'healthy' ? 'Good' : 'Issues'}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  section: {
    padding: 16,
    marginBottom: 8
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4
  },
  statTitle: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center'
  },
  serverCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  serverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  serverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600'
  },
  serverMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  metric: {
    alignItems: 'center'
  },
  metricLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937'
  },
  alertCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4
  },
  alertMessage: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8
  },
  alertTime: {
    fontSize: 12,
    color: '#9ca3af'
  },
  healthCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  healthMetric: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 12
  },
  healthLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4
  },
  healthValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937'
  },
  emptyState: {
    backgroundColor: '#ffffff',
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af'
  },
  executionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#0ea5e9'
  },
  executionText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#0ea5e9',
    fontWeight: '600'
  },
  commandResult: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  commandResultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4
  },
  commandResultText: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'monospace'
  }
});

export default DashboardScreen;
