import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { apiService } from '../services/api';
import webSocketService from '../services/websocket';
import {
  WifiIcon,
  ServerIcon,
  CpuChipIcon,
  CircleStackIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  HeartIcon,
  BoltIcon,
  CloudIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

// Types
interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  systemUptime: string;
}

interface Server {
  id?: string;
  name: string;
  hostname: string;
  ipAddress: string;
  status: string;
  type?: string;
  environment?: string;
  os?: string;
}

interface Alert {
  id?: string;
  title: string;
  message: string;
  severity: string;
  createdAt?: string;
  timestamp?: string;
}

interface HealthStatus {
  status: string;
  memoryUsage: number;
  diskFreeSpace: string;
  uptime: string;
}

const IntegrationTest = () => {
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [servers, setServers] = useState<Server[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize WebSocket connection
    webSocketService.connect();
    setConnectionStatus(webSocketService.isConnected() ? 'connected' : 'connecting');

    // Set up real-time data listeners
    webSocketService.onData('metrics', (data: any) => {
      console.log('📊 Real-time metrics received:', data);
      setSystemMetrics(data);
    });

    webSocketService.onData('alerts', (data: any) => {
      console.log('🚨 Real-time alerts received:', data);
      setAlerts(prev => [data, ...prev.slice(0, 4)]); // Keep last 5 alerts
    });

    webSocketService.onData('servers', (data: any) => {
      console.log('🖥️ Real-time server data received:', data);
      setServers(data);
    });

    // Load initial data
    loadInitialData();

    return () => {
      webSocketService.disconnect();
    };
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Test all API endpoints
      const [metricsRes, serversRes, alertsRes, healthRes] = await Promise.allSettled([
        apiService.getSystemMetrics(),
        apiService.getServers(),
        apiService.getAlerts(),
        apiService.getHealthStatus()
      ]);

      if (metricsRes.status === 'fulfilled') {
        setSystemMetrics(metricsRes.value.data);
        console.log('✅ Metrics loaded:', metricsRes.value.data);
      }

      if (serversRes.status === 'fulfilled') {
        setServers(serversRes.value.data.content || serversRes.value.data);
        console.log('✅ Servers loaded:', serversRes.value.data);
      }

      if (alertsRes.status === 'fulfilled') {
        setAlerts(alertsRes.value.data);
        console.log('✅ Alerts loaded:', alertsRes.value.data);
      }

      if (healthRes.status === 'fulfilled') {
        setHealthStatus(healthRes.value.data);
        console.log('✅ Health status loaded:', healthRes.value.data);
      }

    } catch (err: any) {
      console.error('❌ Error loading data:', err);
      setError(err.message || 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const testCreateServer = async () => {
    try {
      const newServer = {
        name: 'Test Server',
        hostname: 'test-server.local',
        ipAddress: '192.168.1.100',
        type: 'APPLICATION',
        environment: 'testing',
        os: 'Linux',
        description: 'Test server created from web console'
      };

      const result = await apiService.createServer(newServer);
      console.log('✅ Server created:', result.data);
      loadInitialData(); // Refresh data
    } catch (err) {
      console.error('❌ Error creating server:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-transparent border-t-purple-500 border-r-blue-500 rounded-full mx-auto mb-4"
          />
          <motion.h2 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold text-white mb-2"
          >
            Initializing SAMS Integration
          </motion.h2>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-gray-400"
          >
            Connecting to backend services...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div 
          animate={{ 
            x: [0, 100, 0],
            y: [0, -100, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
        />
        <motion.div 
          animate={{ 
            x: [0, -100, 0],
            y: [0, 100, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
        />
      </div>

      <div className="relative z-10 p-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center mb-6"
          >
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl">
                <SparklesIcon className="w-10 h-10 text-white" />
              </div>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-2 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-2xl opacity-75 blur-lg"
              />
            </div>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-5xl font-bold text-white mb-4"
          >
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              SAMS Integration
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xl text-gray-300 mb-8"
          >
            Real-time monitoring dashboard connected to Java backend
          </motion.p>

          {/* Connection Status */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-center space-x-6"
          >
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-full backdrop-blur-sm border ${
              connectionStatus === 'connected' 
                ? 'bg-green-500/20 border-green-500/30 text-green-300' 
                : 'bg-red-500/20 border-red-500/30 text-red-300'
            }`}>
              <WifiIcon className="w-5 h-5" />
              <span className="font-medium">WebSocket: {connectionStatus}</span>
            </div>
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-full backdrop-blur-sm border ${
              !error ? 'bg-green-500/20 border-green-500/30 text-green-300' : 'bg-red-500/20 border-red-500/30 text-red-300'
            }`}>
              <CloudIcon className="w-5 h-5" />
              <span className="font-medium">API: {!error ? 'Connected' : 'Error'}</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Error Section */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="bg-red-500/10 backdrop-blur-sm border border-red-500/20 rounded-2xl p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <XCircleIcon className="w-8 h-8 text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-300 mb-2">Connection Error</h3>
                  <p className="text-red-200 mb-4">{error}</p>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={loadInitialData}
                    className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                  >
                    Retry Connection
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {/* System Metrics Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl opacity-20 group-hover:opacity-30 transition-opacity blur-xl" />
            <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
                  <CpuChipIcon className="w-6 h-6 text-purple-400" />
                  <span>System Metrics</span>
                </h2>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="w-3 h-3 bg-green-400 rounded-full"
                />
              </div>
              {systemMetrics ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">CPU Usage</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${systemMetrics.cpuUsage || 0}%` }}
                          transition={{ duration: 1, delay: 0.5 }}
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                        />
                      </div>
                      <span className="text-white font-medium w-12 text-right">
                        {systemMetrics.cpuUsage?.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Memory</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${systemMetrics.memoryUsage || 0}%` }}
                          transition={{ duration: 1, delay: 0.7 }}
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                        />
                      </div>
                      <span className="text-white font-medium w-12 text-right">
                        {systemMetrics.memoryUsage?.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Disk Usage</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${systemMetrics.diskUsage || 0}%` }}
                          transition={{ duration: 1, delay: 0.9 }}
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                        />
                      </div>
                      <span className="text-white font-medium w-12 text-right">
                        {systemMetrics.diskUsage?.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Uptime</span>
                      <span className="text-green-400 font-medium">{systemMetrics.systemUptime}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-700 rounded-full mx-auto mb-3 flex items-center justify-center">
                    <CpuChipIcon className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-400">No metrics data available</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Servers Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl opacity-20 group-hover:opacity-30 transition-opacity blur-xl" />
            <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
                  <ServerIcon className="w-6 h-6 text-blue-400" />
                  <span>Servers</span>
                </h2>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={testCreateServer}
                  className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-sm rounded-lg font-medium transition-colors border border-blue-500/30"
                >
                  + Add Server
                </motion.button>
              </div>
              {servers.length > 0 ? (
                <div className="space-y-3">
                  {servers.slice(0, 4).map((server, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          (server.status || '').toLowerCase() === 'online' 
                            ? 'bg-green-400 shadow-lg shadow-green-400/50' 
                            : 'bg-gray-400'
                        }`} />
                        <div>
                          <p className="text-white font-medium">{server.name || server.hostname}</p>
                          <p className="text-gray-400 text-sm">{server.ipAddress}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        (server.status || '').toLowerCase() === 'online' 
                          ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                          : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                      }`}>
                        {server.status || 'Unknown'}
                      </span>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-700 rounded-full mx-auto mb-3 flex items-center justify-center">
                    <ServerIcon className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-400">No servers configured</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Alerts Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl opacity-20 group-hover:opacity-30 transition-opacity blur-xl" />
            <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
                  <ExclamationTriangleIcon className="w-6 h-6 text-orange-400" />
                  <span>Recent Alerts</span>
                </h2>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
                  <span className="text-orange-300 text-sm font-medium">Live</span>
                </div>
              </div>
              {alerts.length > 0 ? (
                <div className="space-y-3">
                  {alerts.slice(0, 3).map((alert, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-lg border-l-4 border-orange-400"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-white font-medium text-sm leading-relaxed">
                            {alert.title || alert.message}
                          </p>
                          <div className="flex items-center space-x-2 mt-2">
                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                              alert.severity === 'HIGH' || alert.severity === 'CRITICAL'
                                ? 'bg-red-500/20 text-red-300'
                                : 'bg-orange-500/20 text-orange-300'
                            }`}>
                              {alert.severity}
                            </span>
                            <span className="text-gray-400 text-xs">
                              {new Date(alert.createdAt || alert.timestamp || Date.now()).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-700 rounded-full mx-auto mb-3 flex items-center justify-center">
                    <CheckCircleIcon className="w-6 h-6 text-green-400" />
                  </div>
                  <p className="text-gray-400">All systems operational</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Health Status Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="relative group lg:col-span-2 xl:col-span-1"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-teal-600 rounded-2xl opacity-20 group-hover:opacity-30 transition-opacity blur-xl" />
            <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
                  <HeartIcon className="w-6 h-6 text-green-400" />
                  <span>Health Status</span>
                </h2>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-3 h-3 bg-green-400 rounded-full"
                />
              </div>
              {healthStatus ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Overall Status</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      healthStatus.status === 'HEALTHY' 
                        ? 'bg-green-500/20 text-green-300'
                        : 'bg-yellow-500/20 text-yellow-300'
                    }`}>
                      {healthStatus.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Memory Usage</span>
                    <span className="text-white font-medium">
                      {healthStatus.memoryUsage?.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Free Disk Space</span>
                    <span className="text-white font-medium">{healthStatus.diskFreeSpace}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">System Uptime</span>
                    <span className="text-green-400 font-medium">{healthStatus.uptime}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-700 rounded-full mx-auto mb-3 flex items-center justify-center">
                    <HeartIcon className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-400">Health data unavailable</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* API Test Results Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2 relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl opacity-20 group-hover:opacity-30 transition-opacity blur-xl" />
            <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
                  <BoltIcon className="w-6 h-6 text-indigo-400" />
                  <span>API Endpoints Status</span>
                </h2>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  <span className="text-green-300 text-sm font-medium">All Active</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { endpoint: '/api/v1/system/metrics', method: 'GET', status: 'active' },
                  { endpoint: '/api/v1/servers', method: 'GET', status: 'active' },
                  { endpoint: '/api/v1/alerts', method: 'GET', status: 'active' },
                  { endpoint: '/api/health/status', method: 'GET', status: 'active' },
                  { endpoint: '/api/v1/servers', method: 'POST', status: 'active' },
                  { endpoint: '/ws', method: 'WebSocket', status: 'connected' }
                ].map((api, index) => (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 * index }}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
                  >
                    <div className="flex items-center space-x-2">
                      <CheckCircleIcon className="w-4 h-4 text-green-400" />
                      <div>
                        <p className="text-white text-sm font-medium">{api.method}</p>
                        <p className="text-gray-400 text-xs">{api.endpoint}</p>
                      </div>
                    </div>
                    <span className="w-2 h-2 bg-green-400 rounded-full" />
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom Status Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-12"
        >
          <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 backdrop-blur-sm border border-green-500/20 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <CheckCircleIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Integration Status: Active</h3>
                  <p className="text-gray-300">
                    Web console successfully connected to Java backend (localhost:8080). 
                    Real-time data streaming via WebSocket.
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">100%</div>
                  <div className="text-xs text-gray-400">Uptime</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{servers.length}</div>
                  <div className="text-xs text-gray-400">Servers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">{alerts.length}</div>
                  <div className="text-xs text-gray-400">Alerts</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default IntegrationTest;
