import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast, { Toaster } from 'react-hot-toast'
import IntegrationTestFixed from './components/IntegrationTestFixed'
import { 
  ShieldCheckIcon, 
  ComputerDesktopIcon,
  ServerIcon,
  BoltIcon,
  PowerIcon,
  ClockIcon,
  CpuChipIcon,
  CircleStackIcon,
  WifiIcon,
  ChartBarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

// Types
interface Asset {
  id: number
  name: string
  type: string
  cpu: string
  memory: string
  status: string
  location: string
  uptime: string
}

interface Server {
  id: number
  name: string
  status: 'online' | 'warning' | 'critical' | 'offline'
  cpu: number
  memory: number
  disk: number
  network: number
  uptime: string
  lastSeen: string
}

interface Alert {
  id: number
  type: 'success' | 'info' | 'warning' | 'error'
  message: string
  server: string
  timestamp: string
}

interface Metrics {
  cpu: number
  memory: number
  disk: number
  network: number
  activeConnections: number
  totalRequests: number
  responseTime: number
  throughput: number
}

// Real-time metrics hook
const useRealTimeMetrics = () => {
  const [metrics, setMetrics] = useState<Metrics>({
    cpu: 45,
    memory: 62,
    disk: 78,
    network: 12.5,
    activeConnections: 1247,
    totalRequests: 89423,
    responseTime: 125,
    throughput: 2.4
  })

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        cpu: Math.max(10, Math.min(95, prev.cpu + (Math.random() - 0.5) * 10)),
        memory: Math.max(20, Math.min(90, prev.memory + (Math.random() - 0.5) * 8)),
        disk: Math.max(30, Math.min(95, prev.disk + (Math.random() - 0.5) * 5)),
        network: Math.max(1, Math.min(50, prev.network + (Math.random() - 0.5) * 5)),
        activeConnections: Math.max(500, Math.min(2000, prev.activeConnections + Math.floor((Math.random() - 0.5) * 100))),
        totalRequests: prev.totalRequests + Math.floor(Math.random() * 50),
        responseTime: Math.max(50, Math.min(500, prev.responseTime + (Math.random() - 0.5) * 50)),
        throughput: Math.max(0.5, Math.min(10, prev.throughput + (Math.random() - 0.5) * 1))
      }))
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  return metrics
}

// Login Page Component
const LoginPage = ({ onLogin }: { onLogin: () => void }) => {
  const [pin, setPin] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [attempts, setAttempts] = useState(0)

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + digit)
    }
  }

  const handleClear = () => {
    setPin('')
  }

  const handleSubmit = async () => {
    if (pin.length === 4) {
      setIsLoading(true)
      
      // Simulate authentication
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      if (pin === '1234' || pin === '0000' || pin === '9999') {
        onLogin()
      } else {
        setAttempts(prev => prev + 1)
        setPin('')
        toast.error(`Invalid PIN. Attempt ${attempts + 1}/3`)
        
        if (attempts >= 2) {
          toast.error('Too many failed attempts. Please wait.')
          setTimeout(() => setAttempts(0), 30000)
        }
      }
      
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (pin.length === 4) {
      handleSubmit()
    }
  }, [pin])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center"
          >
            <ShieldCheckIcon className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2">SAMS Enterprise</h1>
          <p className="text-gray-300">Secure Access Required</p>
        </div>

        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-300 mb-4">Enter 4-Digit PIN</label>
          <div className="flex justify-center space-x-4 mb-6">
            {[0, 1, 2, 3].map((index) => (
              <motion.div
                key={index}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-xl font-bold ${
                  pin.length > index
                    ? 'border-blue-400 bg-blue-400/20 text-blue-300'
                    : 'border-white/20 bg-white/5 text-gray-400'
                }`}
              >
                {pin.length > index ? '●' : ''}
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
              <motion.button
                key={digit}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handlePinInput(digit.toString())}
                disabled={isLoading || pin.length >= 4}
                className="h-12 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-semibold transition-colors disabled:opacity-50"
              >
                {digit}
              </motion.button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div></div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handlePinInput('0')}
              disabled={isLoading || pin.length >= 4}
              className="h-12 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-semibold transition-colors disabled:opacity-50"
            >
              0
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleClear}
              disabled={isLoading}
              className="h-12 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-xl text-red-300 font-semibold transition-colors disabled:opacity-50"
            >
              Clear
            </motion.button>
          </div>

          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center mt-4"
            >
              <div className="animate-spin w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full" />
              <span className="ml-2 text-gray-300">Authenticating...</span>
            </motion.div>
          )}
        </div>

        <div className="text-center text-sm text-gray-400">
          <p>Demo PINs: 1234, 0000, 9999</p>
        </div>
      </motion.div>
    </div>
  )
}

// Dashboard Component (Enhanced)
const Dashboard = () => {
  const metrics = useRealTimeMetrics()
  const [servers, setServers] = useState<Server[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])

  useEffect(() => {
    // Initialize and update server data
    const serverInterval = setInterval(() => {
      setServers([
        {
          id: 1,
          name: 'PROD-WEB-01',
          status: Math.random() > 0.1 ? 'online' : 'warning',
          cpu: Math.floor(Math.random() * 80) + 10,
          memory: Math.floor(Math.random() * 70) + 20,
          disk: Math.floor(Math.random() * 60) + 30,
          network: Math.floor(Math.random() * 100) + 50,
          uptime: '99.99%',
          lastSeen: 'Now'
        },
        {
          id: 2,
          name: 'PROD-DB-01',
          status: Math.random() > 0.15 ? 'online' : 'warning',
          cpu: Math.floor(Math.random() * 60) + 20,
          memory: Math.floor(Math.random() * 80) + 10,
          disk: Math.floor(Math.random() * 50) + 40,
          network: Math.floor(Math.random() * 80) + 20,
          uptime: '99.95%',
          lastSeen: 'Now'
        },
        {
          id: 3,
          name: 'DEV-APP-01',
          status: Math.random() > 0.2 ? 'online' : Math.random() > 0.5 ? 'warning' : 'critical',
          cpu: Math.floor(Math.random() * 90) + 5,
          memory: Math.floor(Math.random() * 85) + 10,
          disk: Math.floor(Math.random() * 70) + 25,
          network: Math.floor(Math.random() * 60) + 15,
          uptime: '98.50%',
          lastSeen: 'Now'
        }
      ])
    }, 5000)

    // Generate random alerts
    const alertInterval = setInterval(() => {
      const alertTypes: Alert['type'][] = ['success', 'info', 'warning', 'error']
      const servers = ['PROD-WEB-01', 'PROD-DB-01', 'DEV-APP-01']
      const messages = [
        'System backup completed successfully',
        'High CPU usage detected',
        'Memory usage above threshold',
        'Network latency increased',
        'Service restart completed',
        'Security scan finished',
        'Database optimization running',
        'Cache cleared successfully'
      ]

      const newAlert: Alert = {
        id: Date.now(),
        type: alertTypes[Math.floor(Math.random() * alertTypes.length)],
        message: messages[Math.floor(Math.random() * messages.length)],
        server: servers[Math.floor(Math.random() * servers.length)],
        timestamp: new Date().toLocaleTimeString()
      }

      setAlerts(prev => [newAlert, ...prev.slice(0, 9)])
    }, 8000)

    return () => {
      clearInterval(serverInterval)
      clearInterval(alertInterval)
    }
  }, [])

  const getStatusColor = (status: Server['status']) => {
    switch (status) {
      case 'online': return 'text-green-400 bg-green-400/20'
      case 'warning': return 'text-yellow-400 bg-yellow-400/20'
      case 'critical': return 'text-red-400 bg-red-400/20'
      case 'offline': return 'text-gray-400 bg-gray-400/20'
    }
  }

  const getAlertColor = (type: Alert['type']) => {
    switch (type) {
      case 'success': return 'border-green-400 bg-green-400/10'
      case 'info': return 'border-blue-400 bg-blue-400/10'
      case 'warning': return 'border-yellow-400 bg-yellow-400/10'
      case 'error': return 'border-red-400 bg-red-400/10'
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">System Overview</h1>
          <p className="text-gray-400">Real-time monitoring dashboard</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <ClockIcon className="w-4 h-4" />
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </motion.div>

      {/* Real-time Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white relative overflow-hidden"
        >
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <CpuChipIcon className="w-8 h-8" />
              <span className="text-sm opacity-80">CPU Usage</span>
            </div>
            <motion.div
              key={metrics.cpu}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="text-3xl font-bold mb-1"
            >
              {metrics.cpu.toFixed(1)}%
            </motion.div>
            <div className="text-sm opacity-80">
              {metrics.cpu > 80 ? 'High' : metrics.cpu > 60 ? 'Medium' : 'Normal'}
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white relative overflow-hidden"
        >
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <CircleStackIcon className="w-8 h-8" />
              <span className="text-sm opacity-80">Memory</span>
            </div>
            <motion.div
              key={metrics.memory}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="text-3xl font-bold mb-1"
            >
              {metrics.memory.toFixed(1)}%
            </motion.div>
            <div className="text-sm opacity-80">
              {metrics.memory > 85 ? 'Critical' : metrics.memory > 70 ? 'High' : 'Normal'}
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white relative overflow-hidden"
        >
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <WifiIcon className="w-8 h-8" />
              <span className="text-sm opacity-80">Network</span>
            </div>
            <motion.div
              key={metrics.network}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="text-3xl font-bold mb-1"
            >
              {metrics.network.toFixed(1)} MB/s
            </motion.div>
            <div className="text-sm opacity-80">
              {metrics.activeConnections.toLocaleString()} connections
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white relative overflow-hidden"
        >
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <ChartBarIcon className="w-8 h-8" />
              <span className="text-sm opacity-80">Response Time</span>
            </div>
            <motion.div
              key={metrics.responseTime}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="text-3xl font-bold mb-1"
            >
              {metrics.responseTime.toFixed(0)}ms
            </motion.div>
            <div className="text-sm opacity-80">
              {metrics.totalRequests.toLocaleString()} requests
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10" />
        </motion.div>
      </div>

      {/* Server Status and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Server Status */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6"
        >
          <h2 className="text-xl font-bold text-white mb-6 flex items-center">
            <ServerIcon className="w-6 h-6 mr-2" />
            Server Status
          </h2>
          <div className="space-y-4">
            {servers.map((server, index) => (
              <motion.div
                key={server.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="bg-white/5 rounded-xl p-4 border border-white/10"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <ComputerDesktopIcon className="w-8 h-8 text-blue-400" />
                    <div>
                      <h3 className="font-semibold text-white">{server.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(server.status)}`}>
                        {server.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-400">
                    <div>Uptime: {server.uptime}</div>
                    <div>Last seen: {server.lastSeen}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-gray-400">CPU</div>
                    <div className="font-bold text-white">{server.cpu}%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-400">RAM</div>
                    <div className="font-bold text-white">{server.memory}%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-400">Disk</div>
                    <div className="font-bold text-white">{server.disk}%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-400">Network</div>
                    <div className="font-bold text-white">{server.network} MB/s</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Live Alerts */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6"
        >
          <h2 className="text-xl font-bold text-white mb-6 flex items-center">
            <ExclamationTriangleIcon className="w-6 h-6 mr-2" />
            Live Alerts
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            <AnimatePresence>
              {alerts.map((alert) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={`border-l-4 rounded-r-lg p-3 ${getAlertColor(alert.type)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{alert.message}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-400">{alert.server}</span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-400">{alert.timestamp}</span>
                      </div>
                    </div>
                    <div className="ml-2">
                      {alert.type === 'success' && <CheckCircleIcon className="w-4 h-4 text-green-400" />}
                      {alert.type === 'error' && <XCircleIcon className="w-4 h-4 text-red-400" />}
                      {alert.type === 'warning' && <ExclamationTriangleIcon className="w-4 h-4 text-yellow-400" />}
                      {alert.type === 'info' && <ChartBarIcon className="w-4 h-4 text-blue-400" />}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// Navigation Component
const Navigation = ({ onLogout }: { onLogout: () => void }) => {
  return (
    <nav className="bg-black/20 backdrop-blur-lg border-b border-white/10">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center space-x-2"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <ShieldCheckIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">SAMS Enterprise</h1>
                <p className="text-xs text-gray-400">System Monitoring Dashboard</p>
              </div>
            </motion.div>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="hidden md:flex items-center space-x-6">
              <Link to="/" className="text-gray-300 hover:text-white transition-colors">Dashboard</Link>
              <Link to="/integration-test" className="text-green-300 hover:text-green-200 transition-colors font-medium">🔗 Integration Test</Link>
              <Link to="/assets" className="text-gray-300 hover:text-white transition-colors">Assets</Link>
              <Link to="/remote" className="text-gray-300 hover:text-white transition-colors">Remote</Link>
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-gray-300">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span>Live</span>
              </div>
              <span>•</span>
              <span>3 Servers Online</span>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onLogout}
              className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors"
            >
              <PowerIcon className="w-4 h-4" />
              <span>Logout</span>
            </motion.button>
          </div>
        </div>
      </div>
    </nav>
  )
}

// Asset Inventory Component (Enhanced)
const AssetInventory = () => {
  const [assets, setAssets] = useState<Asset[]>([])

  useEffect(() => {
    // Mock asset data with real-time updates
    const updateAssets = () => {
      setAssets([
        { 
          id: 1, 
          name: 'PROD-WEB-01', 
          type: 'Web Server', 
          cpu: 'Intel Xeon Gold 6248R', 
          memory: '64GB DDR4', 
          status: 'Active',
          location: 'Rack A1',
          uptime: '99.99%'
        },
        { 
          id: 2, 
          name: 'PROD-DB-01', 
          type: 'Database Server', 
          cpu: 'AMD EPYC 7742', 
          memory: '128GB DDR4', 
          status: 'Active',
          location: 'Rack B2',
          uptime: '99.95%'
        },
        { 
          id: 3, 
          name: 'DEV-APP-01', 
          type: 'Development Server', 
          cpu: 'Intel Core i9-12900K', 
          memory: '32GB DDR4', 
          status: 'Warning',
          location: 'Rack C1',
          uptime: '98.50%'
        }
      ])
    }

    updateAssets()
    const interval = setInterval(updateAssets, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Asset Inventory</h1>
          <p className="text-gray-400">Hardware and software asset management</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
        >
          Add Asset
        </motion.button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Asset</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Type</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">CPU</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Memory</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Location</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Uptime</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {assets.map((asset, index) => (
                <motion.tr
                  key={asset.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="hover:bg-white/5 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <ComputerDesktopIcon className="w-8 h-8 text-blue-400" />
                      <div>
                        <div className="font-medium text-white">{asset.name}</div>
                        <div className="text-sm text-gray-400">ID: {asset.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-300">{asset.type}</td>
                  <td className="px-6 py-4 text-gray-300">{asset.cpu}</td>
                  <td className="px-6 py-4 text-gray-300">{asset.memory}</td>
                  <td className="px-6 py-4 text-gray-300">{asset.location}</td>
                  <td className="px-6 py-4 text-gray-300">{asset.uptime}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      asset.status === 'Active' 
                        ? 'bg-green-400/20 text-green-400' 
                        : 'bg-yellow-400/20 text-yellow-400'
                    }`}>
                      {asset.status}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}

// Remote Actions Component (Enhanced)
const RemoteActions = () => {
  const [selectedServer, setSelectedServer] = useState('')
  const [actionResult, setActionResult] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)

  const servers = ['PROD-WEB-01', 'PROD-DB-01', 'DEV-APP-01']

  const executeAction = async (action: string) => {
    if (!selectedServer) {
      toast.error('Please select a server first')
      return
    }

    setIsExecuting(true)
    setActionResult(`Executing ${action} on ${selectedServer}...`)
    
    // Simulate action execution
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000))
    
    const success = Math.random() > 0.2 // 80% success rate
    
    if (success) {
      setActionResult(`✅ ${action} completed successfully on ${selectedServer}`)
      toast.success(`${action} completed successfully!`)
    } else {
      setActionResult(`❌ ${action} failed on ${selectedServer}`)
      toast.error(`${action} failed. Please try again.`)
    }
    
    setIsExecuting(false)
    
    // Clear result after 5 seconds
    setTimeout(() => setActionResult(''), 5000)
  }

  const actions = [
    { name: 'Restart', icon: '🔄', color: 'bg-orange-500', description: 'Restart the server' },
    { name: 'Shutdown', icon: '⚡', color: 'bg-red-500', description: 'Graceful shutdown' },
    { name: 'Update System', icon: '📦', color: 'bg-blue-500', description: 'Install system updates' },
    { name: 'Clear Cache', icon: '🧹', color: 'bg-green-500', description: 'Clear temporary files' },
    { name: 'Backup Data', icon: '💾', color: 'bg-purple-500', description: 'Create backup' },
    { name: 'Health Check', icon: '🔍', color: 'bg-teal-500', description: 'Run diagnostics' }
  ]

  return (
    <div className="p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Remote Actions</h1>
          <p className="text-gray-400">Execute commands on remote servers</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Server Selection */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6"
        >
          <h2 className="text-xl font-bold text-white mb-4 flex items-center">
            <ServerIcon className="w-6 h-6 mr-2" />
            Select Target
          </h2>
          
          <div className="space-y-3">
            {servers.map((server) => (
              <motion.button
                key={server}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedServer(server)}
                className={`w-full p-4 rounded-xl border-2 text-left transition-colors ${
                  selectedServer === server
                    ? 'border-blue-400 bg-blue-400/20 text-blue-300'
                    : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{server}</div>
                    <div className="text-sm opacity-70">Online • Ready</div>
                  </div>
                  <div className="w-3 h-3 bg-green-400 rounded-full" />
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Actions Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6"
        >
          <h2 className="text-xl font-bold text-white mb-6 flex items-center">
            <BoltIcon className="w-6 h-6 mr-2" />
            Available Actions
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {actions.map((action, index) => (
              <motion.button
                key={action.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => executeAction(action.name)}
                disabled={!selectedServer || isExecuting}
                className={`p-4 rounded-xl text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${action.color} hover:shadow-lg`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{action.icon}</span>
                  <div className="text-left">
                    <div className="font-bold">{action.name}</div>
                    <div className="text-sm opacity-80">{action.description}</div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Action Result */}
          <AnimatePresence>
            {actionResult && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`p-4 rounded-xl border-l-4 ${
                  actionResult.includes('✅') 
                    ? 'bg-green-400/10 border-green-400 text-green-300'
                    : actionResult.includes('❌')
                    ? 'bg-red-400/10 border-red-400 text-red-300'
                    : 'bg-blue-400/10 border-blue-400 text-blue-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {isExecuting && <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />}
                  <p className="font-medium">{actionResult}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}

// Main App Component
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const handleLogin = () => {
    setIsAuthenticated(true)
    toast.success('Welcome to SAMS Enterprise Dashboard!')
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    toast.success('You have been logged out successfully')
  }

  if (!isAuthenticated) {
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <Toaster position="top-center" />
      </>
    )
  }

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <Navigation onLogout={handleLogout} />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/integration-test" element={<IntegrationTestFixed />} />
          <Route path="/assets" element={<AssetInventory />} />
          <Route path="/remote" element={<RemoteActions />} />
          <Route path="/alerts" element={<Dashboard />} />
          <Route path="/performance" element={<Dashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster 
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'rgba(0, 0, 0, 0.8)',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)'
            }
          }}
        />
      </div>
    </Router>
  )
}

export default App
