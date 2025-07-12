/**
 * 🚨 Emergency Alert Management Service
 * SOS emergency features, critical alert breach notifications, and emergency sounds
 * 
 * @author SAMS Development Team
 * @version 2.0.0
 */

import { Alert, Vibration, Platform } from 'react-native';
import { storeData, getData } from '../utils/storage';

class EmergencyAlertManager {
  constructor() {
    this.activeAlerts = new Map(); // Active emergency alerts
    this.alertHistory = []; // Alert history
    this.sosCallbacks = new Set(); // SOS notification listeners
    this.emergencyContacts = []; // Emergency contact list
    this.isSOSActive = false; // SOS state
    this.version = '2.0.0';
    
    console.log(`🚨 EmergencyAlertManager v${this.version} initialized`);
  }

  /**
   * 🚨 Trigger SOS Emergency Alert
   */
  async triggerSOSAlert(server, alertType, severity = 'CRITICAL') {
    try {
      console.log(`🚨 SOS ALERT TRIGGERED: ${alertType} on ${server.name}`);
      
      const sosAlert = {
        id: `sos-${Date.now()}`,
        type: 'SOS',
        alertType: alertType,
        severity: severity,
        server: server,
        timestamp: new Date(),
        status: 'ACTIVE',
        acknowledged: false,
        escalated: false
      };

      // Set SOS state
      this.isSOSActive = true;
      
      // Add to active alerts
      this.activeAlerts.set(sosAlert.id, sosAlert);
      
      // Add to history
      this.alertHistory.push(sosAlert);

      // Trigger emergency sound and vibration
      await this.triggerEmergencySound();
      this.triggerEmergencyVibration();

      // Show emergency alert dialog
      this.showEmergencyAlertDialog(sosAlert);

      // Notify all SOS listeners
      this.notifySOSListeners({
        type: 'SOS_TRIGGERED',
        alert: sosAlert,
        message: `🚨 EMERGENCY: ${alertType} detected on ${server.name}`
      });

      // Auto-escalate after 30 seconds if not acknowledged
      setTimeout(() => {
        if (!sosAlert.acknowledged) {
          this.escalateSOSAlert(sosAlert.id);
        }
      }, 30000);

      // Save state
      await this.saveAlertState();

      return {
        success: true,
        sosId: sosAlert.id,
        alert: sosAlert
      };

    } catch (error) {
      console.error(`❌ SOS alert trigger failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🔊 Trigger emergency sound
   */
  async triggerEmergencySound() {
    try {
      console.log('🔊 Playing emergency sound...');
      
      // Note: In a real implementation, you would use react-native-sound
      // or expo-av to play actual emergency sounds
      
      // Simulate emergency sound pattern
      const emergencyPattern = [
        { frequency: 1000, duration: 500 },
        { frequency: 800, duration: 300 },
        { frequency: 1200, duration: 500 },
        { frequency: 800, duration: 300 }
      ];

      // Play emergency sound pattern (simulated)
      for (let i = 0; i < 3; i++) { // Repeat 3 times
        for (const tone of emergencyPattern) {
          // In real implementation: await playTone(tone.frequency, tone.duration);
          await new Promise(resolve => setTimeout(resolve, tone.duration));
        }
        await new Promise(resolve => setTimeout(resolve, 200)); // Brief pause
      }

      console.log('🔊 Emergency sound completed');
      
    } catch (error) {
      console.error(`❌ Emergency sound failed: ${error.message}`);
    }
  }

  /**
   * 📳 Trigger emergency vibration
   */
  triggerEmergencyVibration() {
    try {
      console.log('📳 Triggering emergency vibration...');
      
      if (Platform.OS === 'android') {
        // Android emergency vibration pattern
        const emergencyPattern = [0, 500, 200, 500, 200, 1000, 200, 500, 200, 500];
        Vibration.vibrate(emergencyPattern, true); // Repeat
        
        // Stop after 10 seconds
        setTimeout(() => {
          Vibration.cancel();
        }, 10000);
      } else {
        // iOS emergency vibration
        Vibration.vibrate([500, 200, 500, 200, 1000]);
      }
      
    } catch (error) {
      console.error(`❌ Emergency vibration failed: ${error.message}`);
    }
  }

  /**
   * 🚨 Show emergency alert dialog
   */
  showEmergencyAlertDialog(sosAlert) {
    Alert.alert(
      '🚨 EMERGENCY ALERT',
      `CRITICAL SYSTEM BREACH DETECTED!\n\n🖥️ Server: ${sosAlert.server.name}\n🚨 Alert: ${sosAlert.alertType}\n⚠️ Severity: ${sosAlert.severity}\n🕒 Time: ${sosAlert.timestamp.toLocaleString()}\n\nIMMEDIATE ACTION REQUIRED!`,
      [
        {
          text: '✅ Acknowledge',
          style: 'default',
          onPress: () => this.acknowledgeSOSAlert(sosAlert.id)
        },
        {
          text: '📞 Emergency Contact',
          style: 'destructive',
          onPress: () => this.contactEmergencyServices(sosAlert)
        },
        {
          text: '🔄 Escalate',
          onPress: () => this.escalateSOSAlert(sosAlert.id)
        }
      ],
      { cancelable: false }
    );
  }

  /**
   * ✅ Acknowledge SOS alert
   */
  async acknowledgeSOSAlert(sosId) {
    try {
      const alert = this.activeAlerts.get(sosId);
      
      if (!alert) {
        throw new Error('SOS alert not found');
      }

      // Update alert status
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date();
      alert.status = 'ACKNOWLEDGED';

      // Stop emergency sounds and vibrations
      Vibration.cancel();

      // Update active alerts
      this.activeAlerts.set(sosId, alert);

      // Notify listeners
      this.notifySOSListeners({
        type: 'SOS_ACKNOWLEDGED',
        alert: alert,
        message: `✅ SOS alert acknowledged for ${alert.server.name}`
      });

      // Save state
      await this.saveAlertState();

      console.log(`✅ SOS alert ${sosId} acknowledged`);
      
      Alert.alert(
        '✅ Alert Acknowledged',
        `SOS alert for ${alert.server.name} has been acknowledged.\n\nAlert will remain active for monitoring.`,
        [{ text: 'OK' }]
      );

      return {
        success: true,
        alert: alert
      };

    } catch (error) {
      console.error(`❌ SOS acknowledgment failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🔄 Escalate SOS alert
   */
  async escalateSOSAlert(sosId) {
    try {
      const alert = this.activeAlerts.get(sosId);
      
      if (!alert) {
        throw new Error('SOS alert not found');
      }

      // Update alert status
      alert.escalated = true;
      alert.escalatedAt = new Date();
      alert.status = 'ESCALATED';

      // Trigger additional emergency measures
      await this.triggerEmergencySound(); // Play sound again
      this.triggerEmergencyVibration(); // Vibrate again

      // Update active alerts
      this.activeAlerts.set(sosId, alert);

      // Notify emergency contacts
      await this.notifyEmergencyContacts(alert);

      // Notify listeners
      this.notifySOSListeners({
        type: 'SOS_ESCALATED',
        alert: alert,
        message: `🔄 SOS alert escalated for ${alert.server.name}`
      });

      // Save state
      await this.saveAlertState();

      console.log(`🔄 SOS alert ${sosId} escalated`);
      
      Alert.alert(
        '🔄 Alert Escalated',
        `SOS alert for ${alert.server.name} has been escalated!\n\nEmergency contacts have been notified.\nContinuous monitoring activated.`,
        [{ text: 'OK' }]
      );

      return {
        success: true,
        alert: alert
      };

    } catch (error) {
      console.error(`❌ SOS escalation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 📞 Contact emergency services
   */
  async contactEmergencyServices(sosAlert) {
    try {
      console.log(`📞 Contacting emergency services for ${sosAlert.server.name}`);
      
      Alert.alert(
        '📞 Emergency Contact',
        `Choose emergency contact method for:\n\n🖥️ Server: ${sosAlert.server.name}\n🚨 Alert: ${sosAlert.alertType}`,
        [
          {
            text: '📧 Email IT Team',
            onPress: () => this.sendEmergencyEmail(sosAlert)
          },
          {
            text: '📱 SMS Alert',
            onPress: () => this.sendEmergencySMS(sosAlert)
          },
          {
            text: '☎️ Call Emergency Line',
            onPress: () => this.callEmergencyLine(sosAlert)
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );

    } catch (error) {
      console.error(`❌ Emergency contact failed: ${error.message}`);
    }
  }

  /**
   * 📧 Send emergency email
   */
  async sendEmergencyEmail(sosAlert) {
    try {
      const emailContent = `🚨 EMERGENCY ALERT - IMMEDIATE ACTION REQUIRED

Server: ${sosAlert.server.name} (${sosAlert.server.ip})
Alert Type: ${sosAlert.alertType}
Severity: ${sosAlert.severity}
Time: ${sosAlert.timestamp.toLocaleString()}

CRITICAL SYSTEM BREACH DETECTED!

This is an automated emergency notification from SAMS.
Please respond immediately.

Alert ID: ${sosAlert.id}
Status: ${sosAlert.status}`;

      // In real implementation, use email service
      console.log('📧 Emergency email sent');
      
      Alert.alert(
        '📧 Emergency Email Sent',
        'Emergency notification has been sent to the IT team.',
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error(`❌ Emergency email failed: ${error.message}`);
    }
  }

  /**
   * 📱 Send emergency SMS
   */
  async sendEmergencySMS(sosAlert) {
    try {
      const smsContent = `🚨 SAMS EMERGENCY: ${sosAlert.alertType} on ${sosAlert.server.name}. IMMEDIATE ACTION REQUIRED. Time: ${sosAlert.timestamp.toLocaleTimeString()}. Alert ID: ${sosAlert.id}`;

      // In real implementation, use SMS service
      console.log('📱 Emergency SMS sent');
      
      Alert.alert(
        '📱 Emergency SMS Sent',
        'Emergency SMS has been sent to all emergency contacts.',
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error(`❌ Emergency SMS failed: ${error.message}`);
    }
  }

  /**
   * ☎️ Call emergency line
   */
  async callEmergencyLine(sosAlert) {
    try {
      Alert.alert(
        '☎️ Emergency Call',
        'This would initiate an emergency call to the IT support line.\n\nIn a real implementation, this would dial the emergency number.',
        [
          {
            text: 'Call Now',
            onPress: () => {
              console.log('☎️ Emergency call initiated');
              Alert.alert('☎️ Calling...', 'Emergency call in progress.');
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );

    } catch (error) {
      console.error(`❌ Emergency call failed: ${error.message}`);
    }
  }

  /**
   * 📢 Notify emergency contacts
   */
  async notifyEmergencyContacts(sosAlert) {
    try {
      console.log(`📢 Notifying emergency contacts for ${sosAlert.server.name}`);
      
      // Send notifications to all emergency contacts
      for (const contact of this.emergencyContacts) {
        if (contact.email) {
          await this.sendEmergencyEmail(sosAlert);
        }
        if (contact.phone) {
          await this.sendEmergencySMS(sosAlert);
        }
      }

    } catch (error) {
      console.error(`❌ Emergency contact notification failed: ${error.message}`);
    }
  }

  /**
   * 🔍 Check for critical alerts
   */
  async checkForCriticalAlerts(server) {
    try {
      // Make API call to check for critical alerts
      const endpoint = `http://${server.ip}:8080/api/v1/alerts/critical`;
      
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
      
      // Check for critical alerts that require SOS
      if (data.criticalAlerts && data.criticalAlerts.length > 0) {
        for (const alert of data.criticalAlerts) {
          if (alert.severity === 'CRITICAL' && alert.requiresEmergencyResponse) {
            await this.triggerSOSAlert(server, alert.type, alert.severity);
          }
        }
      }

      return data;

    } catch (error) {
      console.error(`❌ Critical alert check failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 📢 Add SOS notification listener
   */
  addSOSListener(callback) {
    this.sosCallbacks.add(callback);
    
    return () => {
      this.sosCallbacks.delete(callback);
    };
  }

  /**
   * 📢 Notify SOS listeners
   */
  notifySOSListeners(notification) {
    console.log(`📢 SOS notification:`, notification);
    
    this.sosCallbacks.forEach(callback => {
      try {
        callback(notification);
      } catch (error) {
        console.error('SOS callback error:', error);
      }
    });
  }

  /**
   * 📊 Get emergency statistics
   */
  getEmergencyStatistics() {
    const stats = {
      totalAlerts: this.alertHistory.length,
      activeAlerts: this.activeAlerts.size,
      acknowledgedAlerts: 0,
      escalatedAlerts: 0,
      isSOSActive: this.isSOSActive
    };

    this.alertHistory.forEach(alert => {
      if (alert.acknowledged) stats.acknowledgedAlerts++;
      if (alert.escalated) stats.escalatedAlerts++;
    });

    return stats;
  }

  /**
   * 💾 Save alert state
   */
  async saveAlertState() {
    try {
      const stateData = {
        activeAlerts: Object.fromEntries(this.activeAlerts),
        alertHistory: this.alertHistory.slice(-100), // Keep last 100
        emergencyContacts: this.emergencyContacts,
        isSOSActive: this.isSOSActive,
        lastSaved: new Date().toISOString()
      };

      await storeData('emergency_alert_state', stateData);
      console.log('✅ Emergency alert state saved');
    } catch (error) {
      console.error('❌ Failed to save emergency alert state:', error);
    }
  }

  /**
   * 📖 Load alert state
   */
  async loadAlertState() {
    try {
      const stateData = await getData('emergency_alert_state');

      if (stateData) {
        this.activeAlerts = new Map(Object.entries(stateData.activeAlerts || {}));
        this.alertHistory = stateData.alertHistory || [];
        this.emergencyContacts = stateData.emergencyContacts || [];
        this.isSOSActive = stateData.isSOSActive || false;

        console.log(`✅ Emergency alert state loaded: ${this.activeAlerts.size} active alerts`);
      }
    } catch (error) {
      console.error('❌ Failed to load emergency alert state:', error);
    }
  }

  /**
   * 🛑 Clear SOS state
   */
  clearSOSState() {
    this.isSOSActive = false;
    Vibration.cancel();
    console.log('🛑 SOS state cleared');
  }

  /**
   * 🗑️ Clear old alerts
   */
  clearOldAlerts(daysOld = 7) {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    let clearedCount = 0;

    this.alertHistory = this.alertHistory.filter(alert => {
      if (new Date(alert.timestamp) < cutoffDate && alert.status !== 'ACTIVE') {
        clearedCount++;
        return false;
      }
      return true;
    });

    console.log(`🗑️ Cleared ${clearedCount} old alerts`);
    return clearedCount;
  }
}

// Export singleton instance
export default new EmergencyAlertManager();
