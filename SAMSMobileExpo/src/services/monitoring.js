import apiClient from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

class MonitoringService {
  /**
   * Get system health status
   */
  async getHealth() {
    try {
      const response = await apiClient.get(ENDPOINTS.SYSTEM.HEALTH);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get complete system information
   */
  async getSystemInfo() {
    try {
      const response = await apiClient.get(ENDPOINTS.SYSTEM.SYSTEM);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get CPU metrics
   */
  async getCpuMetrics() {
    try {
      const response = await apiClient.get(ENDPOINTS.SYSTEM.CPU);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get memory metrics
   */
  async getMemoryMetrics() {
    try {
      const response = await apiClient.get(ENDPOINTS.SYSTEM.MEMORY);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get disk metrics
   */
  async getDiskMetrics() {
    try {
      const response = await apiClient.get(ENDPOINTS.SYSTEM.DISK);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get network metrics
   */
  async getNetworkMetrics() {
    try {
      const response = await apiClient.get(ENDPOINTS.SYSTEM.NETWORK);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get monitoring overview
   */
  async getMonitoringOverview() {
    try {
      const response = await apiClient.get(ENDPOINTS.MONITORING.OVERVIEW);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get alerts
   */
  async getAlerts() {
    try {
      const response = await apiClient.get(ENDPOINTS.MONITORING.ALERTS);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId) {
    try {
      const endpoint = ENDPOINTS.MONITORING.ACKNOWLEDGE_ALERT.replace('{id}', alertId);
      const response = await apiClient.post(endpoint);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clear all alerts
   */
  async clearAlerts() {
    try {
      const response = await apiClient.delete(ENDPOINTS.MONITORING.CLEAR_ALERTS);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get server info
   */
  async getServerInfo() {
    try {
      const response = await apiClient.get(ENDPOINTS.SYSTEM.INFO);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get all metrics (comprehensive)
   */
  async getAllMetrics() {
    try {
      const [system, cpu, memory, disk, network, alerts] = await Promise.all([
        this.getSystemInfo(),
        this.getCpuMetrics(),
        this.getMemoryMetrics(),
        this.getDiskMetrics(),
        this.getNetworkMetrics(),
        this.getAlerts()
      ]);

      return {
        success: true,
        data: {
          system: system.success ? system.data : null,
          cpu: cpu.success ? cpu.data : null,
          memory: memory.success ? memory.data : null,
          disk: disk.success ? disk.data : null,
          network: network.success ? network.data : null,
          alerts: alerts.success ? alerts.data : [],
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new MonitoringService();
