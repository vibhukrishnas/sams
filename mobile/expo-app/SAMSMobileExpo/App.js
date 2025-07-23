import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  StatusBar,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Animated,
} from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [pin, setPin] = useState('');
  const [servers, setServers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [reports, setReports] = useState([]);
  const [systemStats, setSystemStats] = useState({});
  const [realTimeMetrics, setRealTimeMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeScreen, setActiveScreen] = useState('dashboard');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [currentBackend, setCurrentBackend] = useState('python');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5);
  const [errorLog, setErrorLog] = useState([]);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Backend endpoints
  const backends = {
    python: 'http://localhost:5000',
    java: 'http://localhost:5002', 
    node: 'http://localhost:5003'
  };

  const backendNames = {
    python: '🐍 Python Flask',
    java: '☕ Java Spring',
    node: '🟢 Node.js Express'
  };

  const handleLogin = () => {
    if (pin === '1234') {
      setIsLoggedIn(true);
      fetchData();
    } else {
      Alert.alert('Error', 'Invalid PIN. Try 1234');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setConnectionStatus('connecting');
    
    try {
      const baseUrl = backends[currentBackend];
      
      // Fetch all data from current backend
      const [serversRes, alertsRes, reportsRes, statsRes] = await Promise.all([
        fetch(`${baseUrl}/api/servers`).catch(() => ({ ok: false })),
        fetch(`${baseUrl}/api/alerts`).catch(() => ({ ok: false })),
        fetch(`${baseUrl}/api/reports`).catch(() => ({ ok: false })),
        fetch(`${baseUrl}/api/system/stats`).catch(() => ({ ok: false }))
      ]);

      if (serversRes.ok) {
        const serversData = await serversRes.json();
        setServers(serversData.servers || []);
      }

      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(alertsData.alerts || []);
      }

      if (reportsRes.ok) {
        const reportsData = await reportsRes.json();
        setReports(reportsData.reports || []);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setSystemStats(statsData);
      }

      setConnectionStatus('connected');
      setLastUpdate(new Date());
      
    } catch (error) {
      console.error('Fetch error:', error);
      setConnectionStatus('disconnected');
      setErrorLog(prev => [...prev, { time: new Date(), error: error.message }]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const switchBackend = (backend) => {
    setCurrentBackend(backend);
    setSidebarVisible(false);
    setTimeout(() => fetchData(), 100);
  };

  useEffect(() => {
    if (isLoggedIn && autoRefresh) {
      const interval = setInterval(() => {
        fetchData();
      }, refreshInterval * 1000);
      
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, autoRefresh, refreshInterval, currentBackend]);

  useEffect(() => {
    // Pulse animation
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };
    pulse();
  }, []);

  // Login Screen
  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.loginContainer}>
        <StatusBar backgroundColor="#2c3e50" barStyle="light-content" />
        <View style={styles.logoContainer}>
          <Animated.Text style={[styles.logo, { transform: [{ scale: pulseAnim }] }]}>
            🛡️
          </Animated.Text>
          <Text style={styles.title}>SAMS Mobile</Text>
          <Text style={styles.subtitle}>Server & Application Monitoring System</Text>
        </View>
        
        <View style={styles.formContainer}>
          <Text style={styles.label}>Enter Security PIN</Text>
          <TextInput
            style={styles.pinInput}
            value={pin}
            onChangeText={setPin}
            placeholder="• • • •"
            secureTextEntry
            keyboardType="numeric"
            maxLength={4}
          />
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>🔓 ACCESS SYSTEM</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Dashboard Screen
  const DashboardScreen = () => (
    <ScrollView 
      style={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={['#3498db']}
          tintColor="#3498db"
        />
      }
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 System Overview</Text>
        
        {/* Connection Status */}
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { 
            backgroundColor: connectionStatus === 'connected' ? '#27ae60' : '#e74c3c' 
          }]} />
          <Text style={styles.statusText}>
            {connectionStatus === 'connected' ? '🟢 Connected' : '🔴 Disconnected'} to {backendNames[currentBackend]}
          </Text>
        </View>

        {lastUpdate && (
          <Text style={styles.lastUpdate}>
            🕒 Last updated: {lastUpdate.toLocaleTimeString()}
          </Text>
        )}

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{servers.length}</Text>
            <Text style={styles.statLabel}>🖥️ Servers</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{alerts.length}</Text>
            <Text style={styles.statLabel}>⚠️ Alerts</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{reports.length}</Text>
            <Text style={styles.statLabel}>📋 Reports</Text>
          </View>
        </View>

        {/* System Stats */}
        {systemStats.cpu && (
          <View style={styles.systemCard}>
            <Text style={styles.cardTitle}>💻 System Performance</Text>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>CPU Usage:</Text>
              <Text style={styles.metricValue}>{systemStats.cpu.usage || 'N/A'}%</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Memory:</Text>
              <Text style={styles.metricValue}>{systemStats.memory?.usage || 'N/A'}%</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Disk:</Text>
              <Text style={styles.metricValue}>{systemStats.disk?.usage || 'N/A'}%</Text>
            </View>
          </View>
        )}

        {/* Recent Alerts */}
        {alerts.length > 0 && (
          <View style={styles.alertsCard}>
            <Text style={styles.cardTitle}>🚨 Recent Alerts</Text>
            {alerts.slice(0, 3).map((alert, index) => (
              <View key={index} style={styles.alertItem}>
                <Text style={styles.alertText}>{alert.message || alert.description}</Text>
                <Text style={styles.alertTime}>{alert.timestamp || 'Just now'}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Server List */}
        {servers.length > 0 && (
          <View style={styles.serversCard}>
            <Text style={styles.cardTitle}>🖥️ Servers Status</Text>
            {servers.map((server, index) => (
              <View key={index} style={styles.serverItem}>
                <View style={[styles.serverStatus, { 
                  backgroundColor: server.status === 'online' ? '#27ae60' : '#e74c3c' 
                }]} />
                <Text style={styles.serverName}>{server.name || `Server ${index + 1}`}</Text>
                <Text style={styles.serverLoad}>Load: {server.load || 'N/A'}%</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Loading data...</Text>
        </View>
      )}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#2c3e50" barStyle="light-content" />
      
      {/* Header with Sidebar Toggle */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuButton} onPress={() => setSidebarVisible(true)}>
          <Text style={styles.menuButtonText}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SAMS Mobile</Text>
        <TouchableOpacity style={styles.refreshHeaderButton} onPress={fetchData}>
          <Text style={styles.refreshButtonText}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <DashboardScreen />

      {/* Sidebar */}
      {sidebarVisible && (
        <View style={styles.sidebarOverlay}>
          <TouchableOpacity 
            style={styles.sidebarBackground} 
            onPress={() => setSidebarVisible(false)}
          />
          <View style={styles.sidebar}>
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarTitle}>🛡️ SAMS Control</Text>
              <TouchableOpacity onPress={() => setSidebarVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.sidebarContent}>
              <Text style={styles.sectionLabel}>Backend Selection:</Text>
              
              {Object.keys(backends).map((backend) => (
                <TouchableOpacity
                  key={backend}
                  style={[styles.backendOption, currentBackend === backend && styles.activeBackend]}
                  onPress={() => switchBackend(backend)}
                >
                  <Text style={[styles.backendText, currentBackend === backend && styles.activeBackendText]}>
                    {backendNames[backend]}
                  </Text>
                  {currentBackend === backend && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              ))}
              
              <View style={styles.settingsSection}>
                <Text style={styles.sectionLabel}>Settings:</Text>
                <TouchableOpacity 
                  style={styles.settingOption}
                  onPress={() => setAutoRefresh(!autoRefresh)}
                >
                  <Text style={styles.settingText}>Auto Refresh</Text>
                  <Text style={styles.toggleText}>{autoRefresh ? '🟢 ON' : '🔴 OFF'}</Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
                style={styles.logoutButton}
                onPress={() => {
                  setIsLoggedIn(false);
                  setSidebarVisible(false);
                  setPin('');
                }}
              >
                <Text style={styles.logoutText}>🔒 Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ecf0f1',
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#2c3e50',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logo: {
    fontSize: 60,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#bdc3c7',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 30,
  },
  label: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
  },
  pinInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 15,
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 5,
  },
  loginButton: {
    backgroundColor: '#3498db',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2c3e50',
    paddingHorizontal: 15,
    paddingVertical: 12,
    paddingTop: 50,
  },
  menuButton: {
    padding: 10,
  },
  menuButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  refreshHeaderButton: {
    padding: 10,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 18,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  lastUpdate: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 15,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3498db',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  systemCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  metricLabel: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  alertsCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  alertText: {
    fontSize: 16,
    color: '#e74c3c',
    fontWeight: '600',
  },
  alertTime: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 5,
  },
  serversCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  serverStatus: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 15,
  },
  serverName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  serverLoad: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#7f8c8d',
  },
  sidebarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sidebarBackground: {
    flex: 1,
  },
  sidebar: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: screenWidth * 0.8,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#2c3e50',
  },
  sidebarTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    color: '#fff',
    fontSize: 24,
    padding: 5,
  },
  sidebarContent: {
    flex: 1,
    padding: 20,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  backendOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    marginBottom: 10,
    backgroundColor: '#ecf0f1',
    borderRadius: 10,
  },
  activeBackend: {
    backgroundColor: '#3498db',
  },
  backendText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  activeBackendText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  checkmark: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  settingsSection: {
    marginTop: 30,
  },
  settingOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#ecf0f1',
    borderRadius: 10,
    marginBottom: 10,
  },
  settingText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  toggleText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
