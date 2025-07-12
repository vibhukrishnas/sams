import serverService from './serverService';
import alertService from './alertService';

class HealthService {
  constructor() {
    this.monitoringInterval = null;
    this.isMonitoring = false;
  }

  /**
   * Start monitoring all servers
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.performHealthChecks();
    }, 30000); // Check every 30 seconds
    
    console.log('HealthService: Monitoring started');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('HealthService: Monitoring stopped');
  }

  /**
   * Perform health checks on all servers
   */
  async performHealthChecks() {
    const servers = serverService.getServers();
    
    for (const server of servers) {
      try {
        const healthCheck = await this.simulateHealthCheck(server);
        
        // Update server metrics and status
        await serverService.updateServerMetrics(server.id, healthCheck.metrics);
        await serverService.updateServer(server.id, { 
          status: healthCheck.status,
          lastSeen: new Date().toISOString()
        });
        
        // Create alerts if needed
        await this.checkForAlerts(server, healthCheck);
        
      } catch (error) {
        console.error(`HealthService: Health check failed for server ${server.id}:`, error);
        
        // Mark server as offline
        await serverService.updateServer(server.id, { 
          status: 'offline',
          lastSeen: new Date().toISOString()
        });
        
        // Create offline alert
        await alertService.createAlert(
          server.id,
          'connectivity',
          'Server Offline',
          `Server ${server.name} is not responding`,
          'high'
        );
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
    
    if (random < 0.05) {
      // 5% chance of server being offline
      throw new Error('Server not responding');
    }
    
    // Generate realistic metrics based on server type
    const baseMetrics = this.generateBaseMetrics(server.type);
    const metrics = this.addVariation(baseMetrics);
    
    // Determine status based on metrics
    const status = this.determineStatus(metrics);
    
    return {
      status,
      metrics,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate base metrics for server type
   * @param {string} serverType - Type of server
   * @returns {object} Base metrics
   */
  generateBaseMetrics(serverType) {
    const baseMetrics = {
      web: { cpu: 30, memory: 50, disk: 40, network: 15 },
      database: { cpu: 25, memory: 70, disk: 60, network: 10 },
      loadbalancer: { cpu: 15, memory: 30, disk: 20, network: 25 },
      cache: { cpu: 20, memory: 80, disk: 30, network: 20 },
      storage: { cpu: 10, memory: 40, disk: 85, network: 5 }
    };
    
    return baseMetrics[serverType] || baseMetrics.web;
  }

  /**
   * Add random variation to metrics
   * @param {object} baseMetrics - Base metrics
   * @returns {object} Metrics with variation
   */
  addVariation(baseMetrics) {
    const variation = 15; // ±15% variation
    
    return {
      cpu: Math.max(0, Math.min(100, baseMetrics.cpu + (Math.random() - 0.5) * variation * 2)),
      memory: Math.max(0, Math.min(100, baseMetrics.memory + (Math.random() - 0.5) * variation * 2)),
      disk: Math.max(0, Math.min(100, baseMetrics.disk + (Math.random() - 0.5) * variation * 2)),
      network: Math.max(0, Math.min(100, baseMetrics.network + (Math.random() - 0.5) * variation * 2))
    };
  }

  /**
   * Determine server status based on metrics
   * @param {object} metrics - Server metrics
   * @returns {string} Server status
   */
  determineStatus(metrics) {
    const { cpu, memory, disk } = metrics;
    
    if (cpu > 90 || memory > 95 || disk > 95) {
      return 'critical';
    } else if (cpu > 80 || memory > 85 || disk > 85) {
      return 'warning';
    } else {
      return 'online';
    }
  }

  /**
   * Check for alerts based on health check results
   * @param {object} server - Server object
   * @param {object} healthCheck - Health check results
   */
  async checkForAlerts(server, healthCheck) {
    const { metrics, status } = healthCheck;
    
    // CPU alerts
    if (metrics.cpu > 90) {
      await alertService.createAlert(
        server.id,
        'performance',
        'Critical CPU Usage',
        `CPU usage is ${metrics.cpu.toFixed(1)}% on ${server.name}`,
        'high'
      );
    } else if (metrics.cpu > 80) {
      await alertService.createAlert(
        server.id,
        'performance',
        'High CPU Usage',
        `CPU usage is ${metrics.cpu.toFixed(1)}% on ${server.name}`,
        'medium'
      );
    }
    
    // Memory alerts
    if (metrics.memory > 95) {
      await alertService.createAlert(
        server.id,
        'performance',
        'Critical Memory Usage',
        `Memory usage is ${metrics.memory.toFixed(1)}% on ${server.name}`,
        'high'
      );
    } else if (metrics.memory > 85) {
      await alertService.createAlert(
        server.id,
        'performance',
        'High Memory Usage',
        `Memory usage is ${metrics.memory.toFixed(1)}% on ${server.name}`,
        'medium'
      );
    }
    
    // Disk alerts
    if (metrics.disk > 95) {
      await alertService.createAlert(
        server.id,
        'storage',
        'Critical Disk Usage',
        `Disk usage is ${metrics.disk.toFixed(1)}% on ${server.name}`,
        'high'
      );
    } else if (metrics.disk > 85) {
      await alertService.createAlert(
        server.id,
        'storage',
        'High Disk Usage',
        `Disk usage is ${metrics.disk.toFixed(1)}% on ${server.name}`,
        'medium'
      );
    }
  }

  /**
   * Get health summary for all servers
   * @returns {object} Health summary
   */
  getHealthSummary() {
    const servers = serverService.getServers();
    const total = servers.length;
    const online = servers.filter(s => s.status === 'online').length;
    const warning = servers.filter(s => s.status === 'warning').length;
    const critical = servers.filter(s => s.status === 'critical').length;
    const offline = servers.filter(s => s.status === 'offline').length;
    
    return {
      total,
      online,
      warning,
      critical,
      offline,
      healthScore: total > 0 ? Math.round((online / total) * 100) : 0
    };
  }

  /**
   * Initialize health service
   * @returns {Promise<void>}
   */
  async initialize() {
    this.startMonitoring();
  }
}

export default new HealthService();
