import AsyncStorage from '@react-native-async-storage/async-storage';

class AlertService {
  constructor() {
    this.alerts = [
      {
        id: '1',
        serverId: '1',
        type: 'performance',
        title: 'High CPU Usage',
        message: 'CPU usage is above 80% for the last 5 minutes',
        severity: 'high',
        timestamp: new Date().toISOString(),
        acknowledged: false
      },
      {
        id: '2',
        serverId: '2',
        type: 'storage',
        title: 'Low Disk Space',
        message: 'Disk usage is above 90%',
        severity: 'medium',
        timestamp: new Date().toISOString(),
        acknowledged: false
      }
    ];
  }

  /**
   * Get all alerts
   * @returns {Array} Array of alerts
   */
  getAlerts() {
    return this.alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Get alert by ID
   * @param {string} alertId - Alert ID
   * @returns {object|null} Alert object or null
   */
  getAlert(alertId) {
    return this.alerts.find(alert => alert.id === alertId) || null;
  }

  /**
   * Get alerts by server ID
   * @param {string} serverId - Server ID
   * @returns {Array} Array of alerts for specified server
   */
  getAlertsByServer(serverId) {
    return this.alerts.filter(alert => alert.serverId === serverId);
  }

  /**
   * Get alerts by severity
   * @param {string} severity - Alert severity
   * @returns {Array} Array of alerts with specified severity
   */
  getAlertsBySeverity(severity) {
    return this.alerts.filter(alert => alert.severity === severity);
  }

  /**
   * Get unacknowledged alerts
   * @returns {Array} Array of unacknowledged alerts
   */
  getUnacknowledgedAlerts() {
    return this.alerts.filter(alert => !alert.acknowledged);
  }

  /**
   * Create new alert
   * @param {string} serverId - Server ID
   * @param {string} type - Alert type
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
        severity,
        timestamp: new Date().toISOString(),
        acknowledged: false
      };
      
      this.alerts.push(newAlert);
      await this.saveAlerts();
      return true;
    } catch (error) {
      console.error('AlertService createAlert error:', error);
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
      alert.acknowledgedAt = new Date().toISOString();
      
      await this.saveAlerts();
      return true;
    } catch (error) {
      console.error('AlertService acknowledgeAlert error:', error);
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
      console.error('AlertService deleteAlert error:', error);
      return false;
    }
  }

  /**
   * Clear all acknowledged alerts
   * @returns {Promise<boolean>}
   */
  async clearAcknowledgedAlerts() {
    try {
      this.alerts = this.alerts.filter(alert => !alert.acknowledged);
      await this.saveAlerts();
      return true;
    } catch (error) {
      console.error('AlertService clearAcknowledgedAlerts error:', error);
      return false;
    }
  }

  /**
   * Get alert statistics
   * @returns {object} Alert statistics
   */
  getAlertStats() {
    const total = this.alerts.length;
    const acknowledged = this.alerts.filter(alert => alert.acknowledged).length;
    const unacknowledged = total - acknowledged;
    
    const bySeverity = {
      low: this.alerts.filter(alert => alert.severity === 'low').length,
      medium: this.alerts.filter(alert => alert.severity === 'medium').length,
      high: this.alerts.filter(alert => alert.severity === 'high').length
    };

    return {
      total,
      acknowledged,
      unacknowledged,
      bySeverity
    };
  }

  /**
   * Save alerts to storage
   * @returns {Promise<void>}
   */
  async saveAlerts() {
    try {
      await AsyncStorage.setItem('alerts', JSON.stringify(this.alerts));
    } catch (error) {
      console.error('AlertService saveAlerts error:', error);
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
      console.error('AlertService loadAlerts error:', error);
    }
  }

  /**
   * Initialize alert service
   * @returns {Promise<void>}
   */
  async initialize() {
    await this.loadAlerts();
  }
}

export default new AlertService();
