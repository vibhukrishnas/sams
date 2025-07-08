import AsyncStorage from '@react-native-async-storage/async-storage';

class InfraService {
  constructor() {
    this.servers = [
      {
        id: '1',
        name: 'Web Server 01',
        hostname: 'web-server-01',
        ip: '192.168.1.10',
        status: 'online',
        type: 'web',
        environment: 'production',
        lastSeen: new Date().toISOString(),
        metrics: {
          cpu: 45,
          memory: 62,
          disk: 78,
          network: 12
        }
      },
      {
        id: '2',
        name: 'Database Server 01',
        hostname: 'db-server-01',
        ip: '192.168.1.11',
        status: 'online',
        type: 'database',
        environment: 'production',
        lastSeen: new Date().toISOString(),
        metrics: {
          cpu: 28,
          memory: 85,
          disk: 45,
          network: 8
        }
      },
      {
        id: '3',
        name: 'Load Balancer 01',
        hostname: 'lb-server-01',
        ip: '192.168.1.12',
        status: 'online',
        type: 'loadbalancer',
        environment: 'production',
        lastSeen: new Date().toISOString(),
        metrics: {
          cpu: 15,
          memory: 35,
          disk: 25,
          network: 65
        }
      },
      {
        id: '4',
        name: 'Cache Server 01',
        hostname: 'cache-server-01',
        ip: '192.168.1.13',
        status: 'warning',
        type: 'cache',
        environment: 'production',
        lastSeen: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        metrics: {
          cpu: 75,
          memory: 92,
          disk: 30,
          network: 18
        }
      },
      {
        id: '5',
        name: 'Monitoring Server 01',
        hostname: 'monitoring-server-01',
        ip: '192.168.1.14',
        status: 'offline',
        type: 'monitoring',
        environment: 'production',
        lastSeen: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        metrics: {
          cpu: 0,
          memory: 0,
          disk: 0,
          network: 0
        }
      }
    ];

    this.alerts = [
      {
        id: '1',
        serverId: '4',
        type: 'warning',
        title: 'High Memory Usage',
        message: 'Memory usage is above 90%',
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        acknowledged: false,
        severity: 'medium'
      },
      {
        id: '2',
        serverId: '5',
        type: 'critical',
        title: 'Server Offline',
        message: 'Server has been offline for 30 minutes',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        acknowledged: false,
        severity: 'high'
      },
      {
        id: '3',
        serverId: '1',
        type: 'info',
        title: 'High CPU Usage',
        message: 'CPU usage is above 80%',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        acknowledged: true,
        severity: 'low'
      }
    ];

    this.healthChecks = [];
    this.monitoringInterval = null;
  }

  /**
   * Get all servers
   * @param {string} environment - Filter by environment
   * @param {string} type - Filter by server type
   * @returns {Array}
   */
  getServers(environment = null, type = null) {
    let filteredServers = this.servers;

    if (environment) {
      filteredServers = filteredServers.filter(server => server.environment === environment);
    }

    if (type) {
      filteredServers = filteredServers.filter(server => server.type === type);
    }

    return filteredServers;
  }

  /**
   * Get server by ID
   * @param {string} serverId - Server ID
   * @returns {object|null}
   */
  getServer(serverId) {
    return this.servers.find(server => server.id === serverId) || null;
  }

  /**
   * Add new server
   * @param {object} serverData - Server data
   * @returns {Promise<boolean>}
   */
  async addServer(serverData) {
    try {
      const newServer = {
        id: Date.now().toString(),
        ...serverData,
        status: 'unknown',
        lastSeen: new Date().toISOString(),
        metrics: {
          cpu: 0,
          memory: 0,
          disk: 0,
          network: 0
        }
      };

      this.servers.push(newServer);
      await this.saveServers();
      return true;
    } catch (error) {
      console.error('InfraService addServer error:', error);
      return false;
    }
  }

  /**
   * Update server
   * @param {string} serverId - Server ID
   * @param {object} updates - Server updates
   * @returns {Promise<boolean>}
   */
  async updateServer(serverId, updates) {
    try {
      const serverIndex = this.servers.findIndex(server => server.id === serverId);
      if (serverIndex === -1) return false;

      this.servers[serverIndex] = {
        ...this.servers[serverIndex],
        ...updates,
        lastSeen: new Date().toISOString()
      };

      await this.saveServers();
      return true;
    } catch (error) {
      console.error('InfraService updateServer error:', error);
      return false;
    }
  }

  /**
   * Delete server
   * @param {string} serverId - Server ID
   * @returns {Promise<boolean>}
   */
  async deleteServer(serverId) {
    try {
      this.servers = this.servers.filter(server => server.id !== serverId);
      await this.saveServers();
      return true;
    } catch (error) {
      console.error('InfraService deleteServer error:', error);
      return false;
    }
  }

  /**
   * Get server metrics
   * @param {string} serverId - Server ID
   * @returns {object|null}
   */
  getServerMetrics(serverId) {
    const server = this.getServer(serverId);
    return server ? server.metrics : null;
  }

  /**
   * Update server metrics
   * @param {string} serverId - Server ID
   * @param {object} metrics - New metrics
   * @returns {Promise<boolean>}
   */
  async updateServerMetrics(serverId, metrics) {
    try {
      const server = this.getServer(serverId);
      if (!server) return false;

      server.metrics = { ...server.metrics, ...metrics };
      server.lastSeen = new Date().toISOString();

      // Update server status based on metrics
      this.updateServerStatus(serverId);

      await this.saveServers();
      return true;
    } catch (error) {
      console.error('InfraService updateServerMetrics error:', error);
      return false;
    }
  }

  /**
   * Update server status based on metrics and health checks
   * @param {string} serverId - Server ID
   */
  updateServerStatus(serverId) {
    const server = this.getServer(serverId);
    if (!server) return;

    const { cpu, memory, disk } = server.metrics;
    const timeSinceLastSeen = Date.now() - new Date(server.lastSeen).getTime();

    // Check if server is offline (no response for 5 minutes)
    if (timeSinceLastSeen > 5 * 60 * 1000) {
      server.status = 'offline';
      this.createAlert(serverId, 'critical', 'Server Offline', 'Server has not responded for more than 5 minutes');
      return;
    }

    // Check for critical conditions
    if (cpu > 95 || memory > 95 || disk > 95) {
      server.status = 'critical';
      this.createAlert(serverId, 'critical', 'Critical Resource Usage', 'One or more resources are critically high');
      return;
    }

    // Check for warning conditions
    if (cpu > 80 || memory > 85 || disk > 85) {
      server.status = 'warning';
      this.createAlert(serverId, 'warning', 'High Resource Usage', 'One or more resources are above normal levels');
      return;
    }

    // Server is healthy
    server.status = 'online';
  }

  /**
   * Get all alerts
   * @param {string} type - Filter by alert type
   * @param {boolean} acknowledged - Filter by acknowledgment status
   * @returns {Array}
   */
  getAlerts(type = null, acknowledged = null) {
    let filteredAlerts = this.alerts;

    if (type) {
      filteredAlerts = filteredAlerts.filter(alert => alert.type === type);
    }

    if (acknowledged !== null) {
      filteredAlerts = filteredAlerts.filter(alert => alert.acknowledged === acknowledged);
    }

    return filteredAlerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Get alert by ID
   * @param {string} alertId - Alert ID
   * @returns {object|null}
   */
  getAlert(alertId) {
    return this.alerts.find(alert => alert.id === alertId) || null;
  }

  /**
   * Create new alert
   * @param {string} serverId - Server ID
   * @param {string} type - Alert type (info, warning, critical)
   * @param {string} title - Alert title
   * @param {string} message - Alert message
   * @param {string} severity - Alert severity (low, medium, high)
   * @returns {Promise<boolean>}
   */
  async createAlert(serverId, type, title, message, severity = 'medium') {
    try {
      const newAlert = {
        id: Date.now().toString(),
        serverId,
        type,
        title,
        message,
        timestamp: new Date().toISOString(),
        acknowledged: false,
        severity
      };

      this.alerts.unshift(newAlert);
      await this.saveAlerts();
      return true;
    } catch (error) {
      console.error('InfraService createAlert error:', error);
      return false;
    }
  }

  /**
   * Acknowledge alert
   * @param {string} alertId - Alert ID
   * @returns {Promise<boolean>}
   */
  async acknowledgeAlert(alertId) {
    try {
      const alert = this.getAlert(alertId);
      if (!alert) return false;

      alert.acknowledged = true;
      await this.saveAlerts();
      return true;
    } catch (error) {
      console.error('InfraService acknowledgeAlert error:', error);
      return false;
    }
  }

  /**
   * Delete alert
   * @param {string} alertId - Alert ID
   * @returns {Promise<boolean>}
   */
  async deleteAlert(alertId) {
    try {
      this.alerts = this.alerts.filter(alert => alert.id !== alertId);
      await this.saveAlerts();
      return true;
    } catch (error) {
      console.error('InfraService deleteAlert error:', error);
      return false;
    }
  }

  /**
   * Get infrastructure health summary
   * @returns {object}
   */
  getHealthSummary() {
    const totalServers = this.servers.length;
    const onlineServers = this.servers.filter(server => server.status === 'online').length;
    const warningServers = this.servers.filter(server => server.status === 'warning').length;
    const criticalServers = this.servers.filter(server => server.status === 'critical').length;
    const offlineServers = this.servers.filter(server => server.status === 'offline').length;

    const unacknowledgedAlerts = this.alerts.filter(alert => !alert.acknowledged).length;
    const criticalAlerts = this.alerts.filter(alert => alert.type === 'critical' && !alert.acknowledged).length;

    return {
      totalServers,
      onlineServers,
      warningServers,
      criticalServers,
      offlineServers,
      unacknowledgedAlerts,
      criticalAlerts,
      overallHealth: this.calculateOverallHealth()
    };
  }

  /**
   * Calculate overall infrastructure health score
   * @returns {number} - Health score (0-100)
   */
  calculateOverallHealth() {
    const totalServers = this.servers.length;
    if (totalServers === 0) return 100;

    const onlineWeight = 1.0;
    const warningWeight = 0.7;
    const criticalWeight = 0.3;
    const offlineWeight = 0.0;

    const onlineServers = this.servers.filter(server => server.status === 'online').length;
    const warningServers = this.servers.filter(server => server.status === 'warning').length;
    const criticalServers = this.servers.filter(server => server.status === 'critical').length;
    const offlineServers = this.servers.filter(server => server.status === 'offline').length;

    const healthScore = (
      (onlineServers * onlineWeight) +
      (warningServers * warningWeight) +
      (criticalServers * criticalWeight) +
      (offlineServers * offlineWeight)
    ) / totalServers * 100;

    return Math.round(healthScore);
  }

  /**
   * Start monitoring infrastructure
   * @param {number} interval - Monitoring interval in milliseconds
   */
  startMonitoring(interval = 30000) {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      this.performHealthChecks();
    }, interval);
  }

  /**
   * Stop monitoring infrastructure
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Perform health checks on all servers
   */
  async performHealthChecks() {
    for (const server of this.servers) {
      try {
        // Simulate health check
        const healthCheck = await this.simulateHealthCheck(server);
        
        // Update server metrics
        await this.updateServerMetrics(server.id, healthCheck.metrics);
        
        // Record health check
        this.healthChecks.push({
          id: Date.now().toString(),
          serverId: server.id,
          timestamp: new Date().toISOString(),
          status: healthCheck.status,
          responseTime: healthCheck.responseTime
        });

        // Keep only last 100 health checks per server
        this.healthChecks = this.healthChecks.filter(check => 
          check.serverId === server.id
        ).slice(-100);
      } catch (error) {
        console.error(`Health check failed for server ${server.id}:`, error);
      }
    }
  }

  /**
   * Simulate health check for a server
   * @param {object} server - Server object
   * @returns {Promise<object>}
   */
  async simulateHealthCheck(server) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 500));

    // Simulate different server states
    const random = Math.random();
    
    if (server.status === 'offline') {
      return {
        status: 'offline',
        responseTime: 0,
        metrics: { cpu: 0, memory: 0, disk: 0, network: 0 }
      };
    }

    if (random < 0.05) {
      // 5% chance of server going offline
      return {
        status: 'offline',
        responseTime: 0,
        metrics: { cpu: 0, memory: 0, disk: 0, network: 0 }
      };
    }

    // Generate realistic metrics
    const baseMetrics = server.metrics;
    const variation = 0.1; // 10% variation

    const metrics = {
      cpu: Math.max(0, Math.min(100, baseMetrics.cpu + (Math.random() - 0.5) * variation * 100)),
      memory: Math.max(0, Math.min(100, baseMetrics.memory + (Math.random() - 0.5) * variation * 100)),
      disk: Math.max(0, Math.min(100, baseMetrics.disk + (Math.random() - 0.5) * variation * 100)),
      network: Math.max(0, Math.min(100, baseMetrics.network + (Math.random() - 0.5) * variation * 100))
    };

    const responseTime = 50 + Math.random() * 200; // 50-250ms

    return {
      status: 'online',
      responseTime,
      metrics
    };
  }

  /**
   * Get server types
   * @returns {Array}
   */
  getServerTypes() {
    const types = [...new Set(this.servers.map(server => server.type))];
    return types.sort();
  }

  /**
   * Get environments
   * @returns {Array}
   */
  getEnvironments() {
    const environments = [...new Set(this.servers.map(server => server.environment))];
    return environments.sort();
  }

  /**
   * Save servers to storage
   * @returns {Promise<void>}
   */
  async saveServers() {
    try {
      await AsyncStorage.setItem('servers', JSON.stringify(this.servers));
    } catch (error) {
      console.error('InfraService saveServers error:', error);
    }
  }

  /**
   * Load servers from storage
   * @returns {Promise<void>}
   */
  async loadServers() {
    try {
      const servers = await AsyncStorage.getItem('servers');
      if (servers) {
        this.servers = JSON.parse(servers);
      }
    } catch (error) {
      console.error('InfraService loadServers error:', error);
    }
  }

  /**
   * Save alerts to storage
   * @returns {Promise<void>}
   */
  async saveAlerts() {
    try {
      await AsyncStorage.setItem('alerts', JSON.stringify(this.alerts));
    } catch (error) {
      console.error('InfraService saveAlerts error:', error);
    }
  }

  /**
   * Load alerts from storage
   * @returns {Promise<void>}
   */
  async loadAlerts() {
    try {
      const alerts = await AsyncStorage.getItem('alerts');
      if (alerts) {
        this.alerts = JSON.parse(alerts);
      }
    } catch (error) {
      console.error('InfraService loadAlerts error:', error);
    }
  }

  /**
   * Initialize infrastructure service
   * @returns {Promise<void>}
   */
  async initialize() {
    await this.loadServers();
    await this.loadAlerts();
    this.startMonitoring();
  }
}

export default new InfraService(); 