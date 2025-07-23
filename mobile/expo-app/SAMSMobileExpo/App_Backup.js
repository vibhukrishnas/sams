import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  SafeAreaView, 
  TextInput, 
  Modal, 
  Dimensions, 
  StatusBar,
  Animated,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Vibration
} from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Enhanced Backend API configuration with fallback URLs
const BACKEND_ENDPOINTS = {
  python: 'http://localhost:5000/api',
  java: 'http://localhost:5002/api', 
  nodejs: 'http://localhost:5003/api'
};

// Current active backend
let API_BASE_URL = BACKEND_ENDPOINTS.python;

export default function App() {
  // Enhanced State Management
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
  const [refreshInterval, setRefreshInterval] = useState(5); // seconds
  const [errorLog, setErrorLog] = useState([]);
  
  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Auto-refresh interval ref
  const intervalRef = useRef(null);
  
  const [userInfo, setUserInfo] = useState({
    name: 'Admin User',
    role: 'System Administrator',
    avatar: '👤',
    lastLogin: new Date().toLocaleString()
  });

  const menuItems = [
    { id: 'dashboard', title: 'Dashboard', icon: '📊', badge: null },
    { id: 'servers', title: 'Servers', icon: '🖥️', badge: servers.length },
    { id: 'alerts', title: 'Alerts', icon: '🚨', badge: alerts.filter(a => !a.acknowledged).length },
    { id: 'reports', title: 'Reports', icon: '📈', badge: null },
    { id: 'realtime', title: 'Real-Time', icon: '⚡', badge: 'LIVE' },
    { id: 'settings', title: 'Settings', icon: '⚙️', badge: null },
  ];

  // Enhanced API Functions with Backend Switching
  const switchBackend = (backend) => {
    setCurrentBackend(backend);
    API_BASE_URL = BACKEND_ENDPOINTS[backend];
    logMessage(`Switched to ${backend} backend: ${API_BASE_URL}`);
    setConnectionStatus('connecting');
    loadDashboardData();
  };

  const logMessage = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setErrorLog(prev => [...prev.slice(-9), { timestamp, message }]);
  };

  const apiCall = async (endpoint, options = {}) => {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), 10000)
    );

    const request = fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    try {
      const response = await Promise.race([request, timeout]);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setConnectionStatus('connected');
      return { success: true, data };
    } catch (error) {
      setConnectionStatus('error');
      logMessage(`API Error: ${error.message}`);
      return { success: false, error: error.message };
    }
  };

  const fetchDashboardData = async () => {
    const result = await apiCall('/dashboard');
    if (result.success) {
      const data = result.data;
      setServers(data.servers || []);
      setAlerts(data.alerts || []);
      setSystemStats(data.stats || {});
      setLastUpdate(new Date().toLocaleTimeString());
      logMessage('Dashboard data updated successfully');
    } else {
      logMessage(`Dashboard fetch failed: ${result.error}`);
      
      // Try fallback to other backends
      if (currentBackend === 'python') {
        logMessage('Trying Java backend as fallback...');
        switchBackend('java');
      } else if (currentBackend === 'java') {
        logMessage('Trying Node.js backend as fallback...');
        switchBackend('nodejs');
      }
    }
  };

  const fetchAllServers = async () => {
    const result = await apiCall('/servers');
    if (result.success) {
      setServers(result.data.servers || []);
      setLastUpdate(new Date().toLocaleTimeString());
    }
  };

  const fetchAllAlerts = async () => {
    const result = await apiCall('/alerts');
    if (result.success) {
      setAlerts(result.data.alerts || []);
      setLastUpdate(new Date().toLocaleTimeString());
    }
  };

  const fetchReports = async () => {
    const result = await apiCall('/reports');
    if (result.success) {
      setReports(result.data.reports || []);
      setLastUpdate(new Date().toLocaleTimeString());
    }
  };

  const fetchRealTimeMetrics = async () => {
    // Try multiple endpoints for real-time data
    const endpoints = ['/system/real-time', '/monitoring', '/dashboard'];
    
    for (const endpoint of endpoints) {
      const result = await apiCall(endpoint);
      if (result.success) {
        setRealTimeMetrics(result.data);
        setLastUpdate(new Date().toLocaleTimeString());
        logMessage(`Real-time data fetched from ${endpoint}`);
        return;
      }
    }
    
    logMessage('Failed to fetch real-time metrics from all endpoints');
  };

  const acknowledgeAlert = async (alertId) => {
    const result = await apiCall(`/alerts/${alertId}/acknowledge`, { method: 'POST' });
    if (result.success) {
      Alert.alert('Success', 'Alert acknowledged successfully');
      Vibration.vibrate(100); // Haptic feedback
      fetchAllAlerts(); // Refresh alerts
    } else {
      Alert.alert('Error', `Failed to acknowledge alert: ${result.error}`);
    }
  };

  const handleLogin = () => {
    if (pin === '1234' || pin === 'admin') {
      setIsLoggedIn(true);
      setUserInfo(prev => ({ ...prev, lastLogin: new Date().toLocaleString() }));
      loadDashboardData();
      startAnimations();
      setPin('');
      logMessage('User logged in successfully');
    } else {
      Alert.alert('Error', 'Invalid PIN. Try "1234" or "admin"');
      Vibration.vibrate([100, 50, 100]);
      setPin('');
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    await Promise.all([
      fetchDashboardData(),
      fetchRealTimeMetrics(),
    ]);
    setLoading(false);
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
    logMessage('Data refreshed manually');
  }, []);

  // Enhanced Auto-refresh with configurable interval
  useEffect(() => {
    if (isLoggedIn && autoRefresh) {
      intervalRef.current = setInterval(() => {
        loadDashboardData();
        logMessage(`Auto-refresh (${refreshInterval}s interval)`);
      }, refreshInterval * 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [isLoggedIn, autoRefresh, refreshInterval]);

  // Animations
  const startAnimations = () => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // Slide in animation
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  };

  const startPulseAnimation = () => {
    Animated.loop(
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
      ])
    ).start();
  };

  useEffect(() => {
    if (connectionStatus === 'connected') {
      startPulseAnimation();
    }
  }, [connectionStatus]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'online': case 'healthy': case 'up': case 'running': return '#27ae60';
      case 'warning': case 'degraded': return '#f39c12';
      case 'offline': case 'down': case 'critical': case 'error': return '#e74c3c';
      case 'connecting': case 'pending': return '#3498db';
      default: return '#7f8c8d';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return '#e74c3c';
      case 'high': return '#f39c12';
      case 'medium': return '#3498db';
      case 'low': return '#27ae60';
      default: return '#7f8c8d';
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds) => {
    if (!seconds) return 'Unknown';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return '🟢';
      case 'connecting': return '🟡';
      case 'error': return '🔴';
      default: return '⚪';
    }
  };

  const navigateToScreen = (screenId) => {
    setActiveScreen(screenId);
    setSidebarVisible(false);
    logMessage(`Navigated to ${screenId} screen`);
    
    // Load specific data for screen
    switch (screenId) {
      case 'servers':
        fetchAllServers();
        break;
      case 'alerts':
        fetchAllAlerts();
        break;
      case 'reports':
        fetchReports();
        break;
      case 'realtime':
        fetchRealTimeMetrics();
        break;
    }
  };

  // Enhanced Sidebar Component
  const Sidebar = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={sidebarVisible}
      onRequestClose={() => setSidebarVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.sidebar, { 
          transform: [{ translateX: slideAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [-screenWidth, 0]
          })}]
        }]}>
          {/* User Profile Section */}
          <View style={styles.userProfile}>
            <View style={styles.userAvatarContainer}>
              <Text style={styles.userAvatar}>{userInfo.avatar}</Text>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(connectionStatus) }]} />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{userInfo.name}</Text>
              <Text style={styles.userRole}>{userInfo.role}</Text>
              <Text style={styles.lastLogin}>Last: {userInfo.lastLogin}</Text>
            </View>
          </View>

          {/* Backend Selector */}
          <View style={styles.backendSelector}>
            <Text style={styles.backendTitle}>Backend:</Text>
            <View style={styles.backendButtons}>
              {Object.keys(BACKEND_ENDPOINTS).map(backend => (
                <TouchableOpacity
                  key={backend}
                  style={[
                    styles.backendButton,
                    currentBackend === backend && styles.activeBackendButton
                  ]}
                  onPress={() => switchBackend(backend)}
                >
                  <Text style={[
                    styles.backendButtonText,
                    currentBackend === backend && styles.activeBackendButtonText
                  ]}>
                    {backend.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Menu Items */}
          <ScrollView style={styles.menuContainer}>
            {menuItems.map(item => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  activeScreen === item.id && styles.activeMenuItem
                ]}
                onPress={() => navigateToScreen(item.id)}
              >
                <View style={styles.menuItemLeft}>
                  <Text style={styles.menuIcon}>{item.icon}</Text>
                  <Text style={[
                    styles.menuText,
                    activeScreen === item.id && styles.activeMenuText
                  ]}>
                    {item.title}
                  </Text>
                </View>
                {item.badge && (
                  <View style={[styles.badge, item.badge === 'LIVE' && styles.liveBadge]}>
                    <Text style={styles.badgeText}>{item.badge}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Auto-refresh Settings */}
          <View style={styles.settingsSection}>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => setAutoRefresh(!autoRefresh)}
            >
              <Text style={styles.settingIcon}>{autoRefresh ? '🔄' : '⏸️'}</Text>
              <Text style={styles.settingText}>Auto-refresh ({refreshInterval}s)</Text>
              <Text style={styles.settingStatus}>{autoRefresh ? 'ON' : 'OFF'}</Text>
            </TouchableOpacity>
          </View>

          {/* Connection Status */}
          <View style={styles.connectionInfo}>
            <Text style={styles.connectionStatusText}>
              {getConnectionStatusIcon()} {connectionStatus.toUpperCase()}
            </Text>
            <Text style={styles.lastUpdateText}>
              Last: {lastUpdate || 'Never'}
            </Text>
          </View>

          {/* Logout Button */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => {
              setSidebarVisible(false);
              setIsLoggedIn(false);
              setActiveScreen('dashboard');
              clearInterval(intervalRef.current);
              logMessage('User logged out');
            }}
          >
            <Text style={styles.logoutIcon}>🚪</Text>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>

          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSidebarVisible(false)}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );

  // Enhanced Dashboard Screen
  const DashboardScreen = () => (
    <ScrollView 
      style={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={['#3498db', '#27ae60', '#f39c12']}
          tintColor="#3498db"
        />
      }
    >
      {/* Enhanced Connection Status & Backend Info */}
      <Animated.View style={[styles.connectionStatus, { opacity: fadeAnim }]}>
        <View style={styles.connectionInfo}>
          <Animated.Text style={[styles.connectionText, { transform: [{ scale: pulseAnim }] }]}>
            {getConnectionStatusIcon()} {currentBackend.toUpperCase()}: {connectionStatus}
          </Animated.Text>
          <Text style={styles.dataSourceText}>
            � {API_BASE_URL}
          </Text>
          <Text style={styles.lastUpdateText}>
            ⏰ Last Update: {lastUpdate || 'Never'}
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <Text style={styles.refreshButtonText}>🔄</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Enhanced Quick Stats Grid */}
      <Animated.View style={[styles.statsContainer, { opacity: fadeAnim }]}>
        <View style={[styles.statCard, styles.primaryStatCard]}>
          <Text style={styles.statValue}>{systemStats.online_servers || servers.filter(s => s.status === 'Online').length}</Text>
          <Text style={styles.statLabel}>Online Servers</Text>
          <View style={[styles.statIndicator, { backgroundColor: '#27ae60' }]} />
        </View>
        <View style={[styles.statCard, styles.dangerStatCard]}>
          <Text style={[styles.statValue, { color: '#e74c3c' }]}>{systemStats.critical_alerts || alerts.filter(a => a.severity === 'Critical').length}</Text>
          <Text style={styles.statLabel}>Critical Alerts</Text>
          <View style={[styles.statIndicator, { backgroundColor: '#e74c3c' }]} />
        </View>
        <View style={[styles.statCard, styles.warningStatCard]}>
          <Text style={[styles.statValue, { color: '#f39c12' }]}>{systemStats.total_alerts || alerts.length}</Text>
          <Text style={styles.statLabel}>Total Alerts</Text>
          <View style={[styles.statIndicator, { backgroundColor: '#f39c12' }]} />
        </View>
        <View style={[styles.statCard, styles.infoStatCard]}>
          <Text style={styles.statValue}>{systemStats.total_servers || servers.length}</Text>
          <Text style={styles.statLabel}>Total Servers</Text>
          <View style={[styles.statIndicator, { backgroundColor: '#3498db' }]} />
        </View>
      </Animated.View>

      {/* Real-Time System Metrics Dashboard */}
      {realTimeMetrics && (
        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>💻 Live System Metrics</Text>
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
          </View>
          
          {/* CPU Metrics */}
          {realTimeMetrics.system?.cpu && (
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Text style={styles.metricTitle}>🔥 CPU Usage</Text>
                <Text style={styles.metricValue}>{realTimeMetrics.system.cpu.usage_percent}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { 
                  width: `${realTimeMetrics.system.cpu.usage_percent}%`,
                  backgroundColor: realTimeMetrics.system.cpu.usage_percent > 80 ? '#e74c3c' : 
                                  realTimeMetrics.system.cpu.usage_percent > 60 ? '#f39c12' : '#27ae60'
                }]} />
              </View>
              <Text style={styles.metricDetail}>Cores: {realTimeMetrics.system.cpu.cores} | Load: {realTimeMetrics.system.cpu.load_average?.join(', ')}</Text>
            </View>
          )}

          {/* Memory Metrics */}
          {realTimeMetrics.system?.memory && (
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Text style={styles.metricTitle}>💾 Memory Usage</Text>
                <Text style={styles.metricValue}>{realTimeMetrics.system.memory.usage_percent}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { 
                  width: `${realTimeMetrics.system.memory.usage_percent}%`,
                  backgroundColor: realTimeMetrics.system.memory.usage_percent > 85 ? '#e74c3c' : 
                                  realTimeMetrics.system.memory.usage_percent > 70 ? '#f39c12' : '#27ae60'
                }]} />
              </View>
              <Text style={styles.metricDetail}>
                Used: {formatBytes(realTimeMetrics.system.memory.used)} / {formatBytes(realTimeMetrics.system.memory.total)}
              </Text>
            </View>
          )}

          {/* Disk Metrics */}
          {realTimeMetrics.system?.disk && (
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Text style={styles.metricTitle}>💿 Disk Usage</Text>
                <Text style={styles.metricValue}>{realTimeMetrics.system.disk.usage_percent}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { 
                  width: `${realTimeMetrics.system.disk.usage_percent}%`,
                  backgroundColor: realTimeMetrics.system.disk.usage_percent > 90 ? '#e74c3c' : 
                                  realTimeMetrics.system.disk.usage_percent > 75 ? '#f39c12' : '#27ae60'
                }]} />
              </View>
              <Text style={styles.metricDetail}>
                Free: {formatBytes(realTimeMetrics.system.disk.free)} / {formatBytes(realTimeMetrics.system.disk.total)}
              </Text>
            </View>
          )}

          {/* Network Metrics */}
          {realTimeMetrics.system?.network && (
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Text style={styles.metricTitle}>🌐 Network Activity</Text>
                <Text style={styles.metricValue}>Active</Text>
              </View>
              <View style={styles.networkStats}>
                <View style={styles.networkStat}>
                  <Text style={styles.networkLabel}>Sent</Text>
                  <Text style={styles.networkValue}>{formatBytes(realTimeMetrics.system.network.bytes_sent)}</Text>
                </View>
                <View style={styles.networkStat}>
                  <Text style={styles.networkLabel}>Received</Text>
                  <Text style={styles.networkValue}>{formatBytes(realTimeMetrics.system.network.bytes_recv)}</Text>
                </View>
              </View>
            </View>
          )}

          {/* System Info */}
          {realTimeMetrics.system && (
            <View style={styles.systemInfoCard}>
              <Text style={styles.systemInfoTitle}>🖥️ System Information</Text>
              <View style={styles.systemInfoGrid}>
                <View style={styles.systemInfoItem}>
                  <Text style={styles.systemInfoLabel}>Hostname</Text>
                  <Text style={styles.systemInfoValue}>{realTimeMetrics.system.hostname}</Text>
                </View>
                <View style={styles.systemInfoItem}>
                  <Text style={styles.systemInfoLabel}>Platform</Text>
                  <Text style={styles.systemInfoValue}>{realTimeMetrics.system.platform}</Text>
                </View>
                <View style={styles.systemInfoItem}>
                  <Text style={styles.systemInfoLabel}>Uptime</Text>
                  <Text style={styles.systemInfoValue}>{formatUptime(realTimeMetrics.system.uptime)}</Text>
                </View>
              </View>
            </View>
          )}
        </Animated.View>
      )}

      {/* Recent Alerts Section */}
      {alerts.length > 0 && (
        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          <Text style={styles.sectionTitle}>🚨 Recent Alerts</Text>
          {alerts.slice(0, 3).map((alert, index) => (
            <View key={alert.id || index} style={styles.alertCard}>
              <View style={styles.alertHeader}>
                <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(alert.severity) }]}>
                  <Text style={styles.severityText}>{alert.severity}</Text>
                </View>
                <Text style={styles.alertTime}>{alert.timestamp || 'Just now'}</Text>
              </View>
              <Text style={styles.alertMessage}>{alert.message}</Text>
              {!alert.acknowledged && (
                <TouchableOpacity
                  style={styles.ackButton}
                  onPress={() => acknowledgeAlert(alert.id)}
                >
                  <Text style={styles.ackButtonText}>Acknowledge</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </Animated.View>
      )}

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Loading real-time data...</Text>
        </View>
      )}
    </ScrollView>
  );

  // Real-Time Monitoring Screen
  const RealTimeScreen = () => (
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
        <Text style={styles.sectionTitle}>⚡ Real-Time System Monitor</Text>
        
        {realTimeMetrics && realTimeMetrics.system ? (
          <View>
            {/* CPU Monitoring */}
            <View style={styles.realtimeCard}>
              <Text style={styles.realtimeTitle}>🔥 CPU Performance</Text>
              <View style={styles.realtimeMetric}>
                <Text style={styles.realtimeValue}>{realTimeMetrics.system.cpu?.usage_percent || 0}%</Text>
                <View style={styles.progressBar}>
                  <View style={[
                    styles.progressFill, 
                    { 
                      width: `${realTimeMetrics.system.cpu?.usage_percent || 0}%`,
                      backgroundColor: (realTimeMetrics.system.cpu?.usage_percent || 0) > 80 ? '#e74c3c' : '#27ae60'
                    }
                  ]} />
                </View>
              </View>
            </View>

            {/* Memory Monitoring */}
            <View style={styles.realtimeCard}>
              <Text style={styles.realtimeTitle}>� Memory Usage</Text>
              <View style={styles.realtimeMetric}>
                <Text style={styles.realtimeValue}>{realTimeMetrics.system.memory?.usage_percent || 0}%</Text>
                <View style={styles.progressBar}>
                  <View style={[
                    styles.progressFill, 
                    { 
                      width: `${realTimeMetrics.system.memory?.usage_percent || 0}%`,
                      backgroundColor: (realTimeMetrics.system.memory?.usage_percent || 0) > 85 ? '#e74c3c' : '#27ae60'
                    }
                  ]} />
                </View>
              </View>
            </View>

            {/* Disk Monitoring */}
            <View style={styles.realtimeCard}>
              <Text style={styles.realtimeTitle}>💿 Disk Space</Text>
              <View style={styles.realtimeMetric}>
                <Text style={styles.realtimeValue}>{realTimeMetrics.system.disk?.usage_percent || 0}%</Text>
                <View style={styles.progressBar}>
                  <View style={[
                    styles.progressFill, 
                    { 
                      width: `${realTimeMetrics.system.disk?.usage_percent || 0}%`,
                      backgroundColor: (realTimeMetrics.system.disk?.usage_percent || 0) > 90 ? '#e74c3c' : '#27ae60'
                    }
                  ]} />
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>📊 Fetching real-time data...</Text>
            <ActivityIndicator size="large" color="#3498db" />
          </View>
        )}
      </View>
    </ScrollView>
  );

  // Servers Screen
  const ServersScreen = () => (
    <ScrollView style={styles.content}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🖥️ All Servers ({servers.length})</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={fetchAllServers}>
            <Text style={styles.refreshButtonText}>🔄</Text>
          </TouchableOpacity>
        </View>
        {loading ? (
          <Text style={styles.loadingText}>Loading servers...</Text>
        ) : (
          servers.map(server => (
            <View key={server.id} style={styles.serverCardDetailed}>
              <View style={styles.serverHeader}>
                <View>
                  <Text style={styles.serverName}>{server.name}</Text>
                  <Text style={styles.serverIp}>{server.ip}</Text>
                  <Text style={styles.serverUptime}>Uptime: {server.uptime}</Text>
                </View>
                <View style={styles.serverStatus}>
                  <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(server.status) }]} />
                  <Text style={[styles.statusText, { color: getStatusColor(server.status) }]}>
                    {server.status}
                  </Text>
                </View>
              </View>
              <View style={styles.metricsGrid}>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>CPU</Text>
                  <Text style={styles.metricValue}>{server.cpu}%</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Memory</Text>
                  <Text style={styles.metricValue}>{server.memory}%</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Disk</Text>
                  <Text style={styles.metricValue}>{server.disk}%</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );

  // Alerts Screen
  const AlertsScreen = () => (
    <ScrollView style={styles.content}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🚨 Active Alerts ({alerts.length})</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={fetchAllAlerts}>
            <Text style={styles.refreshButtonText}>🔄</Text>
          </TouchableOpacity>
        </View>
        {loading ? (
          <Text style={styles.loadingText}>Loading alerts...</Text>
        ) : (
          alerts.map(alert => (
            <View key={alert.id} style={styles.alertCardDetailed}>
              <View style={styles.alertHeader}>
                <Text style={styles.alertTitle}>{alert.title}</Text>
                <Text style={[styles.alertSeverity, { color: getSeverityColor(alert.severity) }]}>
                  {alert.severity}
                </Text>
              </View>
              <Text style={styles.alertDescription}>{alert.description}</Text>
              <Text style={styles.alertServer}>Server: {alert.server}</Text>
              <Text style={styles.alertTime}>{alert.time}</Text>
              <TouchableOpacity
                style={styles.acknowledgeButton}
                onPress={() => acknowledgeAlert(alert.id)}
              >
                <Text style={styles.acknowledgeButtonText}>✓ Acknowledge</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );

  // Reports Screen
  const ReportsScreen = () => (
    <ScrollView style={styles.content}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📈 System Reports ({reports.length})</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={fetchReports}>
            <Text style={styles.refreshButtonText}>🔄</Text>
          </TouchableOpacity>
        </View>
        {reports.map(report => (
          <View key={report.id} style={styles.reportCard}>
            <View style={styles.reportHeader}>
              <Text style={styles.reportName}>{report.name}</Text>
              <Text style={[
                styles.reportStatus, 
                { color: report.status === 'Completed' ? '#27ae60' : 
                         report.status === 'Generating' ? '#f39c12' : '#7f8c8d' }
              ]}>
                {report.status}
              </Text>
            </View>
            <Text style={styles.reportType}>Type: {report.type}</Text>
            <Text style={styles.reportDate}>Date: {report.date}</Text>
          </View>
        ))}
        
        <TouchableOpacity style={styles.generateReportButton}>
          <Text style={styles.generateReportButtonText}>+ Generate New Report</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // Settings Screen
  const SettingsScreen = () => (
    <ScrollView style={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚙️ Settings</Text>
        
        <View style={styles.settingGroup}>
          <Text style={styles.settingGroupTitle}>Account</Text>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingItemText}>👤 Profile Settings</Text>
            <Text style={styles.settingChevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingItemText}>🔐 Change PIN</Text>
            <Text style={styles.settingChevron}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.settingGroup}>
          <Text style={styles.settingGroupTitle}>Notifications</Text>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingItemText}>🔔 Alert Notifications</Text>
            <Text style={styles.settingChevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingItemText}>📱 Push Notifications</Text>
            <Text style={styles.settingChevron}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.settingGroup}>
          <Text style={styles.settingGroupTitle}>System</Text>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingItemText}>🔄 Auto Refresh</Text>
            <Text style={styles.settingChevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingItemText}>🌙 Dark Mode</Text>
            <Text style={styles.settingChevron}>›</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  const renderScreen = () => {
    switch (activeScreen) {
      case 'dashboard': return <DashboardScreen />;
      case 'servers': return <ServersScreen />;
      case 'alerts': return <AlertsScreen />;
      case 'reports': return <ReportsScreen />;
      case 'settings': return <SettingsScreen />;
      case 'realtime': return <RealTimeScreen />;
      default: return <DashboardScreen />;
    }
  };

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#2c3e50" barStyle="light-content" />
        <View style={styles.loginContainer}>
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>🚀</Text>
            <Text style={styles.title}>SAMS Mobile</Text>
            <Text style={styles.subtitle}>Server & Alert Monitoring System</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.label}>Enter PIN</Text>
            <TextInput
              style={styles.pinInput}
              value={pin}
              onChangeText={setPin}
              secureTextEntry
              maxLength={4}
              keyboardType="numeric"
              placeholder="••••"
              placeholderTextColor="#7f8c8d"
            />
            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>

            <View style={styles.demoInfo}>
              <Text style={styles.demoText}>Demo PIN: 1234</Text>
              <Text style={styles.demoSubtext}>Use this PIN to access the SAMS dashboard</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#2c3e50" barStyle="light-content" />
      
      {/* Header with Sidebar Toggle */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuButton} onPress={() => setSidebarVisible(true)}>
          <Text style={styles.menuButtonText}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SAMS Mobile</Text>
        <TouchableOpacity style={styles.refreshHeaderButton} onPress={refreshData}>
          <Text style={styles.refreshButtonText}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      {renderScreen()}

      {/* Sidebar Modal */}
      <Sidebar />
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
    marginBottom: 20,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  demoInfo: {
    alignItems: 'center',
    marginTop: 20,
  },
  demoText: {
    color: '#f39c12',
    fontSize: 16,
    fontWeight: 'bold',
  },
  demoSubtext: {
    color: '#bdc3c7',
    fontSize: 14,
    marginTop: 5,
  },
  header: {
    backgroundColor: '#2c3e50',
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  menuButton: {
    padding: 5,
  },
  menuButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  refreshHeaderButton: {
    padding: 5,
  },
  refreshButtonText: {
    fontSize: 18,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  // Sidebar Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
  },
  sidebar: {
    width: screenWidth * 0.75,
    height: '100%',
    backgroundColor: '#2c3e50',
    paddingTop: 50,
  },
  userProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#34495e',
  },
  userAvatar: {
    fontSize: 40,
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userRole: {
    color: '#bdc3c7',
    fontSize: 14,
  },
  menuContainer: {
    flex: 1,
    paddingTop: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  activeMenuItem: {
    backgroundColor: '#34495e',
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 15,
    width: 30,
  },
  menuText: {
    color: '#bdc3c7',
    fontSize: 16,
  },
  activeMenuText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#34495e',
    marginTop: 20,
  },
  logoutIcon: {
    fontSize: 20,
    marginRight: 15,
    width: 30,
  },
  logoutText: {
    color: '#e74c3c',
    fontSize: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    padding: 10,
  },
  closeButtonText: {
    color: '#bdc3c7',
    fontSize: 20,
  },
  // Screen Content Styles
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    flex: 0.48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  statLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 5,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  refreshButton: {
    backgroundColor: '#3498db',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  serverCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serverCardDetailed: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
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
    marginBottom: 10,
  },
  serverInfo: {
    flex: 1,
  },
  serverName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  serverIp: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  serverUptime: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 2,
  },
  serverStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  metric: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 2,
  },
  alertCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertCardDetailed: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  alertSeverity: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  alertDescription: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 5,
  },
  alertServer: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  alertTime: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 5,
  },
  acknowledgeButton: {
    backgroundColor: '#27ae60',
    borderRadius: 5,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  acknowledgeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  reportCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  reportName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  reportStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  reportType: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  reportDate: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 2,
  },
  generateReportButton: {
    backgroundColor: '#3498db',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  generateReportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  settingGroup: {
    marginBottom: 20,
  },
  settingGroupTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  settingItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  settingItemText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  settingChevron: {
    fontSize: 20,
    color: '#7f8c8d',
  },
  // New styles for real backend integration
  connectionStatus: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    margin: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  connectionInfo: {
    flex: 1,
  },
  connectionText: {
    fontSize: 14,
    color: '#27ae60',
    fontWeight: 'bold',
  },
  dataSourceText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 2,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  metricCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  metricLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 5,
  },
  metricDetail: {
    fontSize: 10,
    color: '#bdc3c7',
    marginTop: 2,
  },
  systemInfo: {
    backgroundColor: '#ecf0f1',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  systemInfoText: {
    fontSize: 12,
    color: '#2c3e50',
    textAlign: 'center',
  },
  serverMetrics: {
    alignItems: 'flex-end',
  },
  metricText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  serverType: {
    fontSize: 12,
    color: '#3498db',
    fontStyle: 'italic',
  },
  realAlertBadge: {
    fontSize: 12,
    color: '#e74c3c',
    fontWeight: 'bold',
    marginTop: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  loadingText: {
    color: '#7f8c8d',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  
  // Enhanced Styles for Real-time Features
  backendSelector: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 15,
    marginVertical: 10,
  },
  backendTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  backendButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backendButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 8,
    marginHorizontal: 2,
    alignItems: 'center',
  },
  activeBackendButton: {
    backgroundColor: '#3498db',
  },
  backendButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  activeBackendButtonText: {
    color: '#fff',
  },
  badge: {
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  liveBadge: {
    backgroundColor: '#27ae60',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatarContainer: {
    position: 'relative',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  lastLogin: {
    fontSize: 10,
    color: '#bdc3c7',
    marginTop: 2,
  },
  settingsSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 10,
    marginVertical: 10,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  settingText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  settingStatus: {
    color: '#27ae60',
    fontSize: 12,
    fontWeight: 'bold',
  },
  connectionInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 10,
    marginVertical: 10,
  },
  connectionStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  lastUpdateText: {
    color: '#bdc3c7',
    fontSize: 10,
    marginTop: 2,
  },
  
  // Enhanced Dashboard Styles
  primaryStatCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#27ae60',
  },
  dangerStatCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  warningStatCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#f39c12',
  },
  infoStatCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  statIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  
  // Progress Bar Styles
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#ecf0f1',
    borderRadius: 4,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  
  // Enhanced Metric Cards
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  networkStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  networkStat: {
    alignItems: 'center',
    flex: 1,
  },
  networkLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  networkValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  
  // System Info Grid
  systemInfoCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    marginTop: 10,
  },
  systemInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  systemInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  systemInfoItem: {
    width: '48%',
    marginBottom: 10,
  },
  systemInfoLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  systemInfoValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  
  // Alert Card Enhancements
  alertCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#f39c12',
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  severityBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  severityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  alertMessage: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 8,
  },
  alertTime: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  ackButton: {
    backgroundColor: '#27ae60',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  ackButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // Real-time Screen Styles
  realtimeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  realtimeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  realtimeMetric: {
    alignItems: 'center',
  },
  realtimeValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#27ae60',
    marginBottom: 10,
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noDataText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 20,
  },
  
  // Loading Enhancements
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  
  // Enhanced Section Headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  liveBadge: {
    backgroundColor: '#27ae60',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  liveBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
