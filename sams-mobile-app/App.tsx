import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';

// Simple theme
const theme = {
  colors: {
    primary: '#0f0f23',
    secondary: '#1f1f2e',
    accent: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    textPrimary: '#ffffff',
    textSecondary: '#d1d5db',
    textMuted: '#9ca3af',
    border: '#374151',
    glass: 'rgba(255, 255, 255, 0.05)',
  },
};

// Mock data
const initialMetrics = {
  cpu: 45.2,
  memory: 68.7,
  disk: 82.3,
  network: 'Active',
};

// Simple Tab Component
const Tab = ({ label, active, onPress, icon }) => (
  <TouchableOpacity 
    style={[styles.tab, active && styles.activeTab]} 
    onPress={onPress}
  >
    <Text style={styles.tabIcon}>{icon}</Text>
    <Text style={[styles.tabText, active && styles.activeTabText]}>{label}</Text>
  </TouchableOpacity>
);

// Metric Card Component
const MetricCard = ({ title, value, progress, subtitle, color, icon }) => (
  <View style={styles.metricCard}>
    <View style={styles.metricHeader}>
      <Text style={[styles.metricIcon, { color }]}>{icon}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
    </View>
    <Text style={[styles.metricValue, { color }]}>{value}</Text>
    <View style={styles.progressBar}>
      <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: color }]} />
    </View>
    <Text style={styles.metricSubtitle}>{subtitle}</Text>
  </View>
);

// Action Card Component
const ActionCard = ({ title, icon, color, onPress }) => (
  <TouchableOpacity style={[styles.actionCard, { backgroundColor: color }]} onPress={onPress}>
    <Text style={styles.actionIcon}>{icon}</Text>
    <Text style={styles.actionTitle}>{title}</Text>
  </TouchableOpacity>
);

// Alert Item Component
const AlertItem = ({ title, message, time, type }) => (
  <View style={[styles.alertItem, { borderLeftColor: getAlertColor(type) }]}>
    <Text style={styles.alertTitle}>{title}</Text>
    <Text style={styles.alertMessage}>{message}</Text>
    <Text style={styles.alertTime}>{time}</Text>
  </View>
);

function getAlertColor(type) {
  switch (type) {
    case 'warning': return theme.colors.warning;
    case 'danger': return theme.colors.danger;
    case 'success': return theme.colors.success;
    default: return theme.colors.accent;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [metrics, setMetrics] = useState(initialMetrics);
  const [commandInput, setCommandInput] = useState('');
  const [commandOutput, setCommandOutput] = useState('Ready to execute commands...');
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);

    const metricsTimer = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        cpu: Math.max(20, Math.min(95, prev.cpu + (Math.random() - 0.5) * 10)),
        memory: Math.max(30, Math.min(95, prev.memory + (Math.random() - 0.5) * 5)),
        disk: Math.max(50, Math.min(95, prev.disk + (Math.random() - 0.5) * 2)),
      }));
    }, 3000);

    return () => {
      clearInterval(timer);
      clearInterval(metricsTimer);
    };
  }, []);

  const executeCommand = () => {
    if (!commandInput.trim()) {
      setCommandOutput('Please enter a command');
      return;
    }

    setCommandOutput('Executing command...');
    
    setTimeout(() => {
      let result = '';
      const cmd = commandInput.toLowerCase();
      
      if (cmd.includes('dir')) {
        result = `Directory of C:\\SAMS\n\n2025-08-10  14:30    <DIR>          .\n2025-08-10  14:30    <DIR>          ..\n2025-08-10  14:25    <DIR>          backend\n2025-08-10  14:25    <DIR>          mobile-app\n2025-08-10  14:20         2,048 web_dashboard.html`;
      } else if (cmd.includes('ipconfig')) {
        result = `Windows IP Configuration\n\nEthernet adapter Ethernet:\n   IPv4 Address: 192.168.1.100\n   Subnet Mask: 255.255.255.0\n   Default Gateway: 192.168.1.1`;
      } else {
        result = `Command executed: ${commandInput}\n\nOutput would appear here in a real implementation.\nThis is the SAMS mobile app command interface.\n\nTimestamp: ${new Date().toLocaleString()}`;
      }
      
      setCommandOutput(result);
      setCommandInput('');
    }, 1500);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <ScrollView style={styles.content}>
            <View style={styles.metricsGrid}>
              <MetricCard
                title="CPU Usage"
                value={`${metrics.cpu.toFixed(1)}%`}
                progress={metrics.cpu}
                subtitle="4 cores active"
                color={theme.colors.success}
                icon="🖥️"
              />
              <MetricCard
                title="Memory"
                value={`${metrics.memory.toFixed(1)}%`}
                progress={metrics.memory}
                subtitle="11.2 GB / 16 GB"
                color={theme.colors.warning}
                icon="💾"
              />
              <MetricCard
                title="Disk Space"
                value={`${metrics.disk.toFixed(1)}%`}
                progress={metrics.disk}
                subtitle="411 GB / 500 GB"
                color={theme.colors.danger}
                icon="💽"
              />
              <MetricCard
                title="Network"
                value="Active"
                progress={100}
                subtitle="1 Gbps link"
                color={theme.colors.success}
                icon="🌐"
              />
            </View>

            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsGrid}>
              <ActionCard
                title="System Monitor"
                icon="📈"
                color={theme.colors.accent}
                onPress={() => setActiveTab('monitor')}
              />
              <ActionCard
                title="Run Commands"
                icon="⚡"
                color={theme.colors.success}
                onPress={() => setActiveTab('commands')}
              />
              <ActionCard
                title="Generate Report"
                icon="📋"
                color={theme.colors.warning}
                onPress={() => Alert.alert('Report', 'Report generation feature would be implemented here.')}
              />
              <ActionCard
                title="View Alerts"
                icon="🚨"
                color={theme.colors.danger}
                onPress={() => setActiveTab('alerts')}
              />
            </View>
          </ScrollView>
        );

      case 'monitor':
        return (
          <ScrollView style={styles.content}>
            <Text style={styles.sectionTitle}>Real-time System Monitoring</Text>
            <View style={styles.metricsGrid}>
              <MetricCard
                title="CPU Performance"
                value={`${metrics.cpu.toFixed(1)}%`}
                progress={metrics.cpu}
                subtitle="Temperature: 65°C\nLoad Average: 1.2"
                color={theme.colors.accent}
                icon="⚡"
              />
              <MetricCard
                title="Memory Details"
                value="11.2 GB"
                progress={metrics.memory}
                subtitle="Available: 4.8 GB\nCached: 2.1 GB"
                color={theme.colors.success}
                icon="📊"
              />
              <MetricCard
                title="Network Activity"
                value="125 MB/s"
                progress={80}
                subtitle="Upload: 45 MB/s\nDownload: 80 MB/s"
                color={theme.colors.warning}
                icon="📈"
              />
              <MetricCard
                title="System Uptime"
                value="15d 4h 23m"
                progress={95}
                subtitle="Last restart: July 26\nProcesses: 247"
                color={theme.colors.accent}
                icon="⏱️"
              />
            </View>
          </ScrollView>
        );

      case 'commands':
        return (
          <ScrollView style={styles.content}>
            <Text style={styles.sectionTitle}>Command Executor</Text>
            <TextInput
              style={styles.commandInput}
              placeholder="Enter command (e.g., dir, ipconfig, netstat)"
              placeholderTextColor={theme.colors.textMuted}
              value={commandInput}
              onChangeText={setCommandInput}
              multiline
            />
            <TouchableOpacity style={styles.executeBtn} onPress={executeCommand}>
              <Text style={styles.executeBtnText}>Execute Command</Text>
            </TouchableOpacity>
            <View style={styles.commandOutput}>
              <Text style={styles.commandOutputText}>{commandOutput}</Text>
            </View>
            
            <Text style={styles.sectionTitle}>Quick Commands</Text>
            <View style={styles.actionsGrid}>
              <ActionCard
                title="Directory"
                icon="📁"
                color={theme.colors.accent}
                onPress={() => { setCommandInput('dir'); executeCommand(); }}
              />
              <ActionCard
                title="IP Config"
                icon="🌐"
                color={theme.colors.success}
                onPress={() => { setCommandInput('ipconfig'); executeCommand(); }}
              />
              <ActionCard
                title="Network Status"
                icon="🔗"
                color={theme.colors.warning}
                onPress={() => { setCommandInput('netstat'); executeCommand(); }}
              />
              <ActionCard
                title="Task List"
                icon="📋"
                color={theme.colors.danger}
                onPress={() => { setCommandInput('tasklist'); executeCommand(); }}
              />
            </View>
          </ScrollView>
        );

      case 'alerts':
        return (
          <ScrollView style={styles.content}>
            <Text style={styles.sectionTitle}>System Alerts</Text>
            <AlertItem
              title="⚠️ High Memory Usage"
              message="Memory usage has exceeded 80% threshold"
              time="2 minutes ago"
              type="warning"
            />
            <AlertItem
              title="✅ System Connected"
              message="Backend connection established successfully"
              time="5 minutes ago"
              type="success"
            />
            <AlertItem
              title="🚨 Disk Space Critical"
              message="Disk usage has reached 82% capacity"
              time="10 minutes ago"
              type="danger"
            />
            <AlertItem
              title="ℹ️ System Information"
              message="SAMS mobile monitoring started"
              time="15 minutes ago"
              type="info"
            />
          </ScrollView>
        );

      case 'settings':
        return (
          <ScrollView style={styles.content}>
            <Text style={styles.sectionTitle}>Application Settings</Text>
            <View style={styles.actionsGrid}>
              <ActionCard
                title="Backend Config"
                icon="🔧"
                color={theme.colors.accent}
                onPress={() => Alert.alert('Settings', 'Backend configuration would be implemented here.')}
              />
              <ActionCard
                title="Notifications"
                icon="🔔"
                color={theme.colors.success}
                onPress={() => Alert.alert('Settings', 'Notification settings would be implemented here.')}
              />
              <ActionCard
                title="Security"
                icon="🔒"
                color={theme.colors.warning}
                onPress={() => Alert.alert('Settings', 'Security settings would be implemented here.')}
              />
              <ActionCard
                title="About"
                icon="ℹ️"
                color={theme.colors.danger}
                onPress={() => Alert.alert('About', 'SAMS Mobile v1.0.0\nSystem Administration & Monitoring Suite')}
              />
            </View>
          </ScrollView>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ExpoStatusBar style="light" />
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.appLogo}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoText}>🛡️</Text>
            </View>
            <View>
              <Text style={styles.appTitle}>SAMS</Text>
              <Text style={styles.appSubtitle}>Mobile Monitoring</Text>
            </View>
          </View>
          
          <View style={styles.statusBar}>
            <View style={styles.statusItem}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Real-time Active</Text>
            </View>
            <Text style={styles.timeText}>{currentTime}</Text>
          </View>
        </View>
      </View>

      {/* Navigation Tabs */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
          <Tab
            label="Dashboard"
            icon="📊"
            active={activeTab === 'dashboard'}
            onPress={() => setActiveTab('dashboard')}
          />
          <Tab
            label="Monitor"
            icon="📈"
            active={activeTab === 'monitor'}
            onPress={() => setActiveTab('monitor')}
          />
          <Tab
            label="Commands"
            icon="⚡"
            active={activeTab === 'commands'}
            onPress={() => setActiveTab('commands')}
          />
          <Tab
            label="Alerts"
            icon="🚨"
            active={activeTab === 'alerts'}
            onPress={() => setActiveTab('alerts')}
          />
          <Tab
            label="Settings"
            icon="⚙️"
            active={activeTab === 'settings'}
            onPress={() => setActiveTab('settings')}
          />
        </ScrollView>
      </View>

      {/* Content */}
      {renderContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  header: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  headerContent: {
    flex: 1,
  },
  appLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoIcon: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoText: {
    fontSize: 24,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 1,
  },
  appSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.success,
    marginRight: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
  },
  timeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  tabContainer: {
    backgroundColor: theme.colors.secondary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tabScroll: {
    flexDirection: 'row',
  },
  tab: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    minWidth: 80,
  },
  activeTab: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.accent,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  tabText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  activeTabText: {
    color: theme.colors.accent,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 16,
    marginTop: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  metricCard: {
    backgroundColor: theme.colors.glass,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 16,
    width: '48%',
    marginBottom: 16,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  metricTitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  metricSubtitle: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  commandInput: {
    backgroundColor: theme.colors.secondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontFamily: 'monospace',
    marginBottom: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  executeBtn: {
    backgroundColor: theme.colors.success,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  executeBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  commandOutput: {
    backgroundColor: theme.colors.secondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    minHeight: 200,
    marginBottom: 16,
  },
  commandOutputText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  alertItem: {
    backgroundColor: theme.colors.glass,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  alertTime: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
});
