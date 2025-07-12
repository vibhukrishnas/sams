/**
 * 📱 Widget Manager - Cross-Platform Widget Support
 * Manages iOS and Android widgets for SAMS monitoring
 */

import { Platform, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface WidgetData {
  id: string;
  type: 'server_status' | 'alert_count' | 'system_health' | 'quick_stats';
  title: string;
  data: any;
  lastUpdated: number;
  refreshInterval: number;
}

interface WidgetConfig {
  enabled: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
  showSensitiveData: boolean;
  maxAlerts: number;
  maxServers: number;
}

class WidgetManager {
  private static instance: WidgetManager;
  private config: WidgetConfig;
  private widgets: Map<string, WidgetData> = new Map();
  private refreshTimer?: NodeJS.Timeout;

  constructor() {
    this.config = {
      enabled: true,
      autoRefresh: true,
      refreshInterval: 300000, // 5 minutes
      showSensitiveData: false,
      maxAlerts: 5,
      maxServers: 10,
    };
  }

  static getInstance(): WidgetManager {
    if (!WidgetManager.instance) {
      WidgetManager.instance = new WidgetManager();
    }
    return WidgetManager.instance;
  }

  /**
   * Initialize widget manager
   */
  async initialize(): Promise<void> {
    console.log('📱 Initializing Widget Manager...');

    try {
      await this.loadConfiguration();
      await this.loadWidgetData();
      
      if (this.config.enabled && this.config.autoRefresh) {
        this.startAutoRefresh();
      }

      console.log('✅ Widget Manager initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Widget Manager:', error);
    }
  }

  /**
   * Load widget configuration
   */
  private async loadConfiguration(): Promise<void> {
    try {
      const savedConfig = await AsyncStorage.getItem('widget_config');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }
    } catch (error) {
      console.warn('Failed to load widget config:', error);
    }
  }

  /**
   * Load existing widget data
   */
  private async loadWidgetData(): Promise<void> {
    try {
      const savedWidgets = await AsyncStorage.getItem('widget_data');
      if (savedWidgets) {
        const widgetArray = JSON.parse(savedWidgets);
        widgetArray.forEach((widget: WidgetData) => {
          this.widgets.set(widget.id, widget);
        });
      }
    } catch (error) {
      console.warn('Failed to load widget data:', error);
    }
  }

  /**
   * Create or update widget
   */
  async updateWidget(widgetData: Omit<WidgetData, 'lastUpdated'>): Promise<void> {
    const widget: WidgetData = {
      ...widgetData,
      lastUpdated: Date.now(),
    };

    this.widgets.set(widget.id, widget);
    await this.saveWidgetData();
    await this.updatePlatformWidget(widget);
  }

  /**
   * Update platform-specific widget
   */
  private async updatePlatformWidget(widget: WidgetData): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        await this.updateiOSWidget(widget);
      } else if (Platform.OS === 'android') {
        await this.updateAndroidWidget(widget);
      }
    } catch (error) {
      console.warn(`Failed to update ${Platform.OS} widget:`, error);
    }
  }

  /**
   * Update iOS widget
   */
  private async updateiOSWidget(widget: WidgetData): Promise<void> {
    // iOS WidgetKit integration
    const { WidgetKit } = NativeModules;
    
    if (WidgetKit) {
      const widgetPayload = this.formatWidgetPayload(widget);
      await WidgetKit.updateWidget(widget.id, widgetPayload);
      console.log(`📱 Updated iOS widget: ${widget.id}`);
    }
  }

  /**
   * Update Android widget
   */
  private async updateAndroidWidget(widget: WidgetData): Promise<void> {
    // Android App Widget integration
    const { AndroidWidget } = NativeModules;
    
    if (AndroidWidget) {
      const widgetPayload = this.formatWidgetPayload(widget);
      await AndroidWidget.updateWidget(widget.id, widgetPayload);
      console.log(`📱 Updated Android widget: ${widget.id}`);
    }
  }

  /**
   * Format widget payload for platform
   */
  private formatWidgetPayload(widget: WidgetData): any {
    const basePayload = {
      id: widget.id,
      type: widget.type,
      title: widget.title,
      lastUpdated: widget.lastUpdated,
    };

    switch (widget.type) {
      case 'server_status':
        return {
          ...basePayload,
          servers: widget.data.servers?.slice(0, this.config.maxServers) || [],
          totalServers: widget.data.totalServers || 0,
          onlineServers: widget.data.onlineServers || 0,
          offlineServers: widget.data.offlineServers || 0,
        };

      case 'alert_count':
        return {
          ...basePayload,
          totalAlerts: widget.data.totalAlerts || 0,
          criticalAlerts: widget.data.criticalAlerts || 0,
          warningAlerts: widget.data.warningAlerts || 0,
          infoAlerts: widget.data.infoAlerts || 0,
          recentAlerts: widget.data.recentAlerts?.slice(0, this.config.maxAlerts) || [],
        };

      case 'system_health':
        return {
          ...basePayload,
          overallHealth: widget.data.overallHealth || 'unknown',
          healthScore: widget.data.healthScore || 0,
          issues: widget.data.issues || 0,
          uptime: widget.data.uptime || '0%',
        };

      case 'quick_stats':
        return {
          ...basePayload,
          stats: widget.data.stats || {},
          trends: widget.data.trends || {},
        };

      default:
        return basePayload;
    }
  }

  /**
   * Create server status widget
   */
  async createServerStatusWidget(servers: any[]): Promise<void> {
    const onlineServers = servers.filter(s => s.status === 'online').length;
    const offlineServers = servers.filter(s => s.status === 'offline').length;

    await this.updateWidget({
      id: 'server_status',
      type: 'server_status',
      title: 'Server Status',
      data: {
        servers: servers.slice(0, this.config.maxServers),
        totalServers: servers.length,
        onlineServers,
        offlineServers,
      },
      refreshInterval: this.config.refreshInterval,
    });
  }

  /**
   * Create alert count widget
   */
  async createAlertCountWidget(alerts: any[]): Promise<void> {
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
    const warningAlerts = alerts.filter(a => a.severity === 'warning').length;
    const infoAlerts = alerts.filter(a => a.severity === 'info').length;

    await this.updateWidget({
      id: 'alert_count',
      type: 'alert_count',
      title: 'Active Alerts',
      data: {
        totalAlerts: alerts.length,
        criticalAlerts,
        warningAlerts,
        infoAlerts,
        recentAlerts: alerts.slice(0, this.config.maxAlerts),
      },
      refreshInterval: this.config.refreshInterval,
    });
  }

  /**
   * Create system health widget
   */
  async createSystemHealthWidget(healthData: any): Promise<void> {
    await this.updateWidget({
      id: 'system_health',
      type: 'system_health',
      title: 'System Health',
      data: {
        overallHealth: healthData.overallHealth || 'good',
        healthScore: healthData.healthScore || 95,
        issues: healthData.issues || 0,
        uptime: healthData.uptime || '99.9%',
      },
      refreshInterval: this.config.refreshInterval,
    });
  }

  /**
   * Create quick stats widget
   */
  async createQuickStatsWidget(stats: any): Promise<void> {
    await this.updateWidget({
      id: 'quick_stats',
      type: 'quick_stats',
      title: 'Quick Stats',
      data: {
        stats: {
          totalServers: stats.totalServers || 0,
          activeAlerts: stats.activeAlerts || 0,
          avgResponseTime: stats.avgResponseTime || '0ms',
          uptime: stats.uptime || '100%',
        },
        trends: stats.trends || {},
      },
      refreshInterval: this.config.refreshInterval,
    });
  }

  /**
   * Refresh all widgets
   */
  async refreshAllWidgets(): Promise<void> {
    console.log('🔄 Refreshing all widgets...');

    try {
      // This would typically fetch fresh data from your API
      // For now, we'll simulate the refresh
      for (const [widgetId, widget] of this.widgets) {
        if (Date.now() - widget.lastUpdated > widget.refreshInterval) {
          await this.updatePlatformWidget(widget);
        }
      }

      console.log('✅ All widgets refreshed');
    } catch (error) {
      console.error('❌ Failed to refresh widgets:', error);
    }
  }

  /**
   * Start auto-refresh timer
   */
  private startAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.refreshTimer = setInterval(() => {
      this.refreshAllWidgets();
    }, this.config.refreshInterval);

    console.log(`🔄 Widget auto-refresh started (${this.config.refreshInterval}ms)`);
  }

  /**
   * Stop auto-refresh timer
   */
  private stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
      console.log('🛑 Widget auto-refresh stopped');
    }
  }

  /**
   * Save widget data to storage
   */
  private async saveWidgetData(): Promise<void> {
    try {
      const widgetArray = Array.from(this.widgets.values());
      await AsyncStorage.setItem('widget_data', JSON.stringify(widgetArray));
    } catch (error) {
      console.warn('Failed to save widget data:', error);
    }
  }

  /**
   * Update configuration
   */
  async updateConfig(newConfig: Partial<WidgetConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    await AsyncStorage.setItem('widget_config', JSON.stringify(this.config));

    // Restart auto-refresh if interval changed
    if (newConfig.refreshInterval || newConfig.autoRefresh !== undefined) {
      this.stopAutoRefresh();
      if (this.config.enabled && this.config.autoRefresh) {
        this.startAutoRefresh();
      }
    }
  }

  /**
   * Get widget configuration
   */
  getConfig(): WidgetConfig {
    return { ...this.config };
  }

  /**
   * Get all widgets
   */
  getWidgets(): WidgetData[] {
    return Array.from(this.widgets.values());
  }

  /**
   * Remove widget
   */
  async removeWidget(widgetId: string): Promise<void> {
    this.widgets.delete(widgetId);
    await this.saveWidgetData();

    // Remove from platform
    try {
      if (Platform.OS === 'ios') {
        const { WidgetKit } = NativeModules;
        if (WidgetKit) {
          await WidgetKit.removeWidget(widgetId);
        }
      } else if (Platform.OS === 'android') {
        const { AndroidWidget } = NativeModules;
        if (AndroidWidget) {
          await AndroidWidget.removeWidget(widgetId);
        }
      }
    } catch (error) {
      console.warn('Failed to remove platform widget:', error);
    }
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.stopAutoRefresh();
    console.log('🧹 Widget Manager cleaned up');
  }
}

export default WidgetManager;
export { WidgetData, WidgetConfig };
