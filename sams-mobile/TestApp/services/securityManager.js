/**
 * 🔒 SAMS Security Management Service
 * Real security operations with actual server changes and notifications
 * 
 * @author SAMS Development Team
 * @version 2.0.0
 */

import { Alert, Platform } from 'react-native';
import { storeData, getData } from '../utils/storage';

class SecurityManager {
  constructor() {
    this.securityStates = new Map(); // Track security states per server
    this.securityHistory = []; // Track security changes
    this.notificationCallbacks = new Set(); // Notification listeners
    this.version = '2.0.0';
    
    console.log(`🔒 SecurityManager v${this.version} initialized`);
  }

  /**
   * 🔐 Apply real security configuration to server
   */
  async applySecurityConfiguration(server, securityLevel) {
    try {
      console.log(`🔒 Applying ${securityLevel} security to ${server.name} (${server.ip})`);
      
      const operation = {
        id: `security-${Date.now()}`,
        server: server,
        level: securityLevel,
        startTime: new Date(),
        status: 'in-progress'
      };

      // Show real-time progress
      this.notifySecurityChange({
        type: 'progress',
        message: `🔄 Applying ${securityLevel} security configuration...`,
        server: server.name
      });

      // Make actual API call to server
      const response = await this.makeSecurityAPICall(server, securityLevel);
      
      if (response.success) {
        // Update security state
        this.securityStates.set(server.id, {
          level: securityLevel,
          lastUpdated: new Date(),
          changes: response.changes || [],
          status: 'active'
        });

        // Store security history
        this.securityHistory.push({
          ...operation,
          status: 'completed',
          endTime: new Date(),
          changes: response.changes
        });

        // Save to persistent storage
        await this.saveSecurityState();

        // Show success notification
        this.notifySecurityChange({
          type: 'success',
          message: `✅ ${securityLevel} security applied to ${server.name}`,
          changes: response.changes,
          server: server.name
        });

        return {
          success: true,
          changes: response.changes,
          level: securityLevel
        };
      } else {
        throw new Error(response.error || 'Security configuration failed');
      }

    } catch (error) {
      console.error(`❌ Security configuration failed: ${error.message}`);
      
      this.notifySecurityChange({
        type: 'error',
        message: `❌ Security configuration failed: ${error.message}`,
        server: server.name
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 🌐 Make actual API call to server for security changes
   */
  async makeSecurityAPICall(server, securityLevel) {
    try {
      const endpoint = `http://${server.ip}:8080/api/v1/server/configure/security`;
      
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Security configuration timeout')), 30000)
      );

      const fetchPromise = fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SAMS-Mobile-Security/2.0'
        },
        body: JSON.stringify({
          server_id: server.id,
          config_type: 'security',
          level: securityLevel,
          timestamp: new Date().toISOString()
        })
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Security API response:`, data);
      
      return data;

    } catch (error) {
      console.error(`❌ Security API call failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🔍 Get current security status for server
   */
  getSecurityStatus(serverId) {
    const state = this.securityStates.get(serverId);
    
    if (!state) {
      return {
        level: 'unknown',
        status: 'not-configured',
        lastUpdated: null,
        changes: []
      };
    }

    return {
      level: state.level,
      status: state.status,
      lastUpdated: state.lastUpdated,
      changes: state.changes,
      isActive: state.status === 'active'
    };
  }

  /**
   * 🔄 Toggle specific security feature
   */
  async toggleSecurityFeature(server, feature, enabled) {
    try {
      console.log(`🔄 Toggling ${feature} to ${enabled ? 'ON' : 'OFF'} for ${server.name}`);

      const response = await this.makeSecurityToggleAPICall(server, feature, enabled);
      
      if (response.success) {
        // Update local state
        const currentState = this.securityStates.get(server.id) || {};
        currentState.features = currentState.features || {};
        currentState.features[feature] = {
          enabled: enabled,
          lastToggled: new Date(),
          changes: response.changes || []
        };
        
        this.securityStates.set(server.id, currentState);
        await this.saveSecurityState();

        // Notify about the change
        this.notifySecurityChange({
          type: 'feature-toggle',
          message: `🔄 ${feature} ${enabled ? 'enabled' : 'disabled'} on ${server.name}`,
          feature: feature,
          enabled: enabled,
          changes: response.changes,
          server: server.name
        });

        return {
          success: true,
          feature: feature,
          enabled: enabled,
          changes: response.changes
        };
      } else {
        throw new Error(response.error || 'Feature toggle failed');
      }

    } catch (error) {
      console.error(`❌ Security feature toggle failed: ${error.message}`);
      
      this.notifySecurityChange({
        type: 'error',
        message: `❌ Failed to toggle ${feature}: ${error.message}`,
        server: server.name
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 🌐 Make API call for security feature toggle
   */
  async makeSecurityToggleAPICall(server, feature, enabled) {
    try {
      const endpoint = `http://${server.ip}:8080/api/v1/server/security/toggle`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          server_id: server.id,
          feature: feature,
          enabled: enabled,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error(`❌ Security toggle API call failed: ${error.message}`);
      throw error;
    }
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
   * 📢 Notify about security changes
   */
  notifySecurityChange(notification) {
    console.log(`📢 Security notification:`, notification);
    
    this.notificationCallbacks.forEach(callback => {
      try {
        callback(notification);
      } catch (error) {
        console.error('Notification callback error:', error);
      }
    });
  }

  /**
   * 💾 Save security state to persistent storage
   */
  async saveSecurityState() {
    try {
      const stateData = {
        states: Object.fromEntries(this.securityStates),
        history: this.securityHistory.slice(-100), // Keep last 100 entries
        lastSaved: new Date().toISOString()
      };

      await storeData('security_state', stateData);
      console.log('✅ Security state saved to storage');
    } catch (error) {
      console.error('❌ Failed to save security state:', error);
    }
  }

  /**
   * 📖 Load security state from persistent storage
   */
  async loadSecurityState() {
    try {
      const stateData = await getData('security_state');
      
      if (stateData) {
        this.securityStates = new Map(Object.entries(stateData.states || {}));
        this.securityHistory = stateData.history || [];
        
        console.log(`✅ Security state loaded: ${this.securityStates.size} servers`);
      }
    } catch (error) {
      console.error('❌ Failed to load security state:', error);
    }
  }

  /**
   * 📊 Get security statistics
   */
  getSecurityStatistics() {
    const stats = {
      totalServers: this.securityStates.size,
      securedServers: 0,
      highSecurity: 0,
      standardSecurity: 0,
      recentChanges: 0
    };

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    this.securityStates.forEach(state => {
      if (state.status === 'active') {
        stats.securedServers++;
        
        if (state.level === 'high') {
          stats.highSecurity++;
        } else if (state.level === 'standard') {
          stats.standardSecurity++;
        }
      }
    });

    stats.recentChanges = this.securityHistory.filter(
      entry => new Date(entry.startTime) > oneDayAgo
    ).length;

    return stats;
  }
}

// Export singleton instance
export default new SecurityManager();
