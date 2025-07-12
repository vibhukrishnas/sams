/**
 * ⚙️ Services and Processes Management Service
 * Real-time valiant features for services and processes management
 * 
 * @author SAMS Development Team
 * @version 2.0.0
 */

import { Alert } from 'react-native';
import { storeData, getData } from '../utils/storage';

class ServicesProcessesManager {
  constructor() {
    this.services = new Map(); // Services cache per server
    this.processes = new Map(); // Processes cache per server
    this.monitoringIntervals = new Map(); // Real-time monitoring intervals
    this.notificationCallbacks = new Set(); // Notification listeners
    this.version = '2.0.0';
    
    console.log(`⚙️ ServicesProcessesManager v${this.version} initialized`);
  }

  /**
   * 🔄 Start real-time service monitoring
   */
  async startServiceMonitoring(server, interval = 30000) {
    try {
      console.log(`🔄 Starting service monitoring for ${server.name}`);
      
      // Clear existing interval if any
      this.stopServiceMonitoring(server.id);
      
      // Start new monitoring interval
      const monitoringId = setInterval(async () => {
        try {
          await this.refreshServices(server);
          await this.refreshProcesses(server);
        } catch (error) {
          console.error(`❌ Monitoring error for ${server.name}: ${error.message}`);
        }
      }, interval);
      
      this.monitoringIntervals.set(server.id, monitoringId);
      
      // Initial load
      await this.refreshServices(server);
      await this.refreshProcesses(server);
      
      this.notifyChange({
        type: 'monitoring-started',
        message: `🔄 Real-time monitoring started for ${server.name}`,
        server: server.name
      });
      
      return {
        success: true,
        monitoringId: monitoringId
      };
      
    } catch (error) {
      console.error(`❌ Failed to start monitoring: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🛑 Stop real-time service monitoring
   */
  stopServiceMonitoring(serverId) {
    const monitoringId = this.monitoringIntervals.get(serverId);
    
    if (monitoringId) {
      clearInterval(monitoringId);
      this.monitoringIntervals.delete(serverId);
      
      console.log(`🛑 Stopped monitoring for server ${serverId}`);
      
      this.notifyChange({
        type: 'monitoring-stopped',
        message: `🛑 Monitoring stopped for server ${serverId}`
      });
    }
  }

  /**
   * 🔄 Refresh services from server
   */
  async refreshServices(server) {
    try {
      const endpoint = `http://${server.ip}:8080/api/v1/services`;
      
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Services refresh timeout')), 15000)
      );

      const fetchPromise = fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SAMS-Mobile-Services/2.0'
        }
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Update services cache
      this.services.set(server.id, {
        services: data.services || [],
        lastUpdated: new Date(),
        server: server
      });
      
      // Check for service status changes
      this.checkServiceStatusChanges(server.id, data.services || []);
      
      return data.services || [];
      
    } catch (error) {
      console.error(`❌ Failed to refresh services: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🔄 Refresh processes from server
   */
  async refreshProcesses(server) {
    try {
      const endpoint = `http://${server.ip}:8080/api/v1/processes`;
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Update processes cache
      this.processes.set(server.id, {
        processes: data.processes || [],
        lastUpdated: new Date(),
        server: server
      });
      
      // Check for high resource usage processes
      this.checkHighResourceProcesses(server.id, data.processes || []);
      
      return data.processes || [];
      
    } catch (error) {
      console.error(`❌ Failed to refresh processes: ${error.message}`);
      throw error;
    }
  }

  /**
   * ⚙️ Control service (start/stop/restart)
   */
  async controlService(server, serviceName, action) {
    try {
      console.log(`⚙️ ${action} service ${serviceName} on ${server.name}`);
      
      const endpoint = `http://${server.ip}:8080/api/v1/services/${serviceName}/${action}`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          server_id: server.id,
          service_name: serviceName,
          action: action,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Refresh services after action
      setTimeout(() => {
        this.refreshServices(server);
      }, 2000);
      
      this.notifyChange({
        type: 'service-action',
        message: `✅ Service ${serviceName} ${action} completed on ${server.name}`,
        service: serviceName,
        action: action,
        server: server.name
      });
      
      return {
        success: true,
        service: serviceName,
        action: action,
        result: result
      };
      
    } catch (error) {
      console.error(`❌ Service control failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🔄 Kill process
   */
  async killProcess(server, processId, processName) {
    try {
      console.log(`🔄 Killing process ${processName} (${processId}) on ${server.name}`);
      
      const endpoint = `http://${server.ip}:8080/api/v1/processes/${processId}/kill`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          server_id: server.id,
          process_id: processId,
          process_name: processName,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Refresh processes after action
      setTimeout(() => {
        this.refreshProcesses(server);
      }, 2000);
      
      this.notifyChange({
        type: 'process-killed',
        message: `🔄 Process ${processName} killed on ${server.name}`,
        process: processName,
        processId: processId,
        server: server.name
      });
      
      return {
        success: true,
        process: processName,
        processId: processId,
        result: result
      };
      
    } catch (error) {
      console.error(`❌ Process kill failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🔍 Check for service status changes
   */
  checkServiceStatusChanges(serverId, newServices) {
    const cached = this.services.get(serverId);
    
    if (!cached || !cached.services) return;
    
    const oldServices = cached.services;
    
    newServices.forEach(newService => {
      const oldService = oldServices.find(s => s.name === newService.name);
      
      if (oldService && oldService.status !== newService.status) {
        this.notifyChange({
          type: 'service-status-change',
          message: `⚙️ Service ${newService.name} changed from ${oldService.status} to ${newService.status}`,
          service: newService.name,
          oldStatus: oldService.status,
          newStatus: newService.status,
          serverId: serverId
        });
      }
    });
  }

  /**
   * 🔍 Check for high resource usage processes
   */
  checkHighResourceProcesses(serverId, processes) {
    const highCpuThreshold = 80; // 80% CPU
    const highMemoryThreshold = 1024; // 1GB Memory
    
    processes.forEach(process => {
      if (process.cpu > highCpuThreshold) {
        this.notifyChange({
          type: 'high-cpu-process',
          message: `🔥 High CPU usage: ${process.name} using ${process.cpu}% CPU`,
          process: process.name,
          cpu: process.cpu,
          serverId: serverId,
          severity: 'warning'
        });
      }
      
      if (process.memory > highMemoryThreshold) {
        this.notifyChange({
          type: 'high-memory-process',
          message: `💾 High memory usage: ${process.name} using ${this.formatBytes(process.memory)}`,
          process: process.name,
          memory: process.memory,
          serverId: serverId,
          severity: 'warning'
        });
      }
    });
  }

  /**
   * 📊 Get services for server
   */
  getServices(serverId) {
    const cached = this.services.get(serverId);
    return cached ? cached.services : [];
  }

  /**
   * 📊 Get processes for server
   */
  getProcesses(serverId) {
    const cached = this.processes.get(serverId);
    return cached ? cached.processes : [];
  }

  /**
   * 📊 Get service statistics
   */
  getServiceStatistics(serverId) {
    const services = this.getServices(serverId);
    
    const stats = {
      total: services.length,
      running: 0,
      stopped: 0,
      error: 0,
      lastUpdated: null
    };
    
    services.forEach(service => {
      switch (service.status?.toLowerCase()) {
        case 'running':
        case 'started':
          stats.running++;
          break;
        case 'stopped':
        case 'disabled':
          stats.stopped++;
          break;
        case 'error':
        case 'failed':
          stats.error++;
          break;
      }
    });
    
    const cached = this.services.get(serverId);
    if (cached) {
      stats.lastUpdated = cached.lastUpdated;
    }
    
    return stats;
  }

  /**
   * 📊 Get process statistics
   */
  getProcessStatistics(serverId) {
    const processes = this.getProcesses(serverId);
    
    const stats = {
      total: processes.length,
      totalCpu: 0,
      totalMemory: 0,
      highCpuCount: 0,
      highMemoryCount: 0,
      lastUpdated: null
    };
    
    processes.forEach(process => {
      stats.totalCpu += process.cpu || 0;
      stats.totalMemory += process.memory || 0;
      
      if (process.cpu > 50) stats.highCpuCount++;
      if (process.memory > 512) stats.highMemoryCount++;
    });
    
    const cached = this.processes.get(serverId);
    if (cached) {
      stats.lastUpdated = cached.lastUpdated;
    }
    
    return stats;
  }

  /**
   * 📏 Format bytes to human readable
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 📢 Add notification listener
   */
  addNotificationListener(callback) {
    this.notificationCallbacks.add(callback);
    
    return () => {
      this.notificationCallbacks.delete(callback);
    };
  }

  /**
   * 📢 Notify about changes
   */
  notifyChange(notification) {
    console.log(`📢 Services/Processes notification:`, notification);
    
    this.notificationCallbacks.forEach(callback => {
      try {
        callback(notification);
      } catch (error) {
        console.error('Notification callback error:', error);
      }
    });
  }

  /**
   * 💾 Save state
   */
  async saveState() {
    try {
      const stateData = {
        services: Object.fromEntries(this.services),
        processes: Object.fromEntries(this.processes),
        lastSaved: new Date().toISOString()
      };

      await storeData('services_processes_state', stateData);
      console.log('✅ Services/Processes state saved');
    } catch (error) {
      console.error('❌ Failed to save state:', error);
    }
  }

  /**
   * 📖 Load state
   */
  async loadState() {
    try {
      const stateData = await getData('services_processes_state');
      
      if (stateData) {
        this.services = new Map(Object.entries(stateData.services || {}));
        this.processes = new Map(Object.entries(stateData.processes || {}));
        
        console.log(`✅ Services/Processes state loaded`);
      }
    } catch (error) {
      console.error('❌ Failed to load state:', error);
    }
  }

  /**
   * 🧹 Cleanup
   */
  cleanup() {
    // Stop all monitoring intervals
    this.monitoringIntervals.forEach((intervalId, serverId) => {
      clearInterval(intervalId);
    });
    this.monitoringIntervals.clear();
    
    console.log('🧹 Services/Processes manager cleanup completed');
  }
}

// Export singleton instance
export default new ServicesProcessesManager();
