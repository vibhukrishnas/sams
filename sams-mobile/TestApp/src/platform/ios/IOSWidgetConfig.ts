/**
 * iOS Widget Configuration for SAMS
 * Supports iOS 14+ WidgetKit
 */

export interface WidgetData {
  criticalAlerts: number;
  totalAlerts: number;
  serverStatus: 'online' | 'offline' | 'warning' | 'error';
  lastUpdate: string;
  topAlert?: {
    title: string;
    severity: string;
    time: string;
  };
}

export interface WidgetConfiguration {
  family: 'small' | 'medium' | 'large';
  displayName: string;
  description: string;
  supportedFamilies: string[];
  configurationDisplayName: string;
  kind: string;
}

// iOS Widget Data Provider
export const IOSWidgetDataProvider = {
  async fetchWidgetData(): Promise<WidgetData> {
    try {
      const response = await fetch('http://192.168.1.10:8080/api/alerts/widget-summary');
      const data = await response.json();
      
      return {
        criticalAlerts: data.critical || 0,
        totalAlerts: data.total || 0,
        serverStatus: data.serverStatus || 'error',
        lastUpdate: new Date().toISOString(),
        topAlert: data.topAlert || null,
      };
    } catch (error) {
      console.error('iOS Widget data fetch error:', error);
      return {
        criticalAlerts: 0,
        totalAlerts: 0,
        serverStatus: 'error',
        lastUpdate: new Date().toISOString(),
      };
    }
  },

  // Format data for different widget sizes
  formatForSmallWidget(data: WidgetData) {
    return {
      title: 'SAMS',
      criticalCount: data.criticalAlerts,
      status: data.serverStatus,
      lastUpdate: new Date(data.lastUpdate).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
    };
  },

  formatForMediumWidget(data: WidgetData) {
    return {
      title: 'SAMS Monitor',
      criticalCount: data.criticalAlerts,
      totalCount: data.totalAlerts,
      status: data.serverStatus,
      topAlert: data.topAlert,
      lastUpdate: new Date(data.lastUpdate).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
    };
  },

  formatForLargeWidget(data: WidgetData) {
    return {
      title: 'SAMS Server Monitor',
      criticalCount: data.criticalAlerts,
      totalCount: data.totalAlerts,
      status: data.serverStatus,
      topAlert: data.topAlert,
      lastUpdate: new Date(data.lastUpdate).toLocaleString(),
      showChart: true,
      showDetails: true,
    };
  },
};

// Widget Configuration
export const IOSWidgetConfig: WidgetConfiguration = {
  family: 'small',
  displayName: 'SAMS Monitor',
  description: 'Monitor your servers and alerts at a glance',
  supportedFamilies: ['systemSmall', 'systemMedium', 'systemLarge'],
  configurationDisplayName: 'SAMS Server Monitor',
  kind: 'SAMSWidget',
};

// Widget Timeline Provider
export const IOSWidgetTimeline = {
  // Update interval in minutes
  updateInterval: 15,

  // Generate timeline entries
  generateTimeline(data: WidgetData) {
    const now = new Date();
    const entries = [];

    // Current entry
    entries.push({
      date: now,
      data: data,
    });

    // Future entries (every 15 minutes for next 2 hours)
    for (let i = 1; i <= 8; i++) {
      const futureDate = new Date(now.getTime() + (i * 15 * 60 * 1000));
      entries.push({
        date: futureDate,
        data: data, // In a real app, this would be predicted/cached data
      });
    }

    return entries;
  },

  // Reload policy
  getReloadPolicy(data: WidgetData) {
    // More frequent updates for critical alerts
    if (data.criticalAlerts > 0) {
      return {
        policy: 'atEnd',
        interval: 5 * 60, // 5 minutes
      };
    }

    // Normal update interval
    return {
      policy: 'atEnd',
      interval: 15 * 60, // 15 minutes
    };
  },
};

// Widget Intent Configuration (for user customization)
export const IOSWidgetIntents = {
  serverSelection: {
    title: 'Server Selection',
    description: 'Choose which servers to monitor',
    type: 'INStringIntent',
    options: [
      { value: 'all', title: 'All Servers' },
      { value: 'critical', title: 'Critical Servers Only' },
      { value: 'production', title: 'Production Servers' },
      { value: 'development', title: 'Development Servers' },
    ],
  },

  alertTypes: {
    title: 'Alert Types',
    description: 'Choose which alert types to display',
    type: 'INStringIntent',
    options: [
      { value: 'all', title: 'All Alerts' },
      { value: 'critical', title: 'Critical Only' },
      { value: 'high', title: 'High Priority' },
      { value: 'medium', title: 'Medium Priority' },
    ],
  },

  refreshInterval: {
    title: 'Refresh Interval',
    description: 'How often to update the widget',
    type: 'INIntegerIntent',
    options: [
      { value: 5, title: '5 minutes' },
      { value: 15, title: '15 minutes' },
      { value: 30, title: '30 minutes' },
      { value: 60, title: '1 hour' },
    ],
  },
};

// Widget Deep Link Handling
export const IOSWidgetDeepLinks = {
  // Handle widget tap
  handleWidgetTap(url: string) {
    const urlParts = url.split('://');
    if (urlParts.length < 2) return null;

    const [scheme, path] = urlParts;
    if (scheme !== 'sams') return null;

    const pathComponents = path.split('/');
    const action = pathComponents[0];

    switch (action) {
      case 'alerts':
        return {
          screen: 'Alerts',
          params: {
            filter: pathComponents[1] || 'all',
          },
        };

      case 'servers':
        return {
          screen: 'Servers',
          params: {
            serverId: pathComponents[1] || null,
          },
        };

      case 'dashboard':
        return {
          screen: 'Dashboard',
          params: {},
        };

      default:
        return {
          screen: 'Dashboard',
          params: {},
        };
    }
  },

  // Generate deep link URLs
  generateDeepLink(screen: string, params?: any) {
    let url = `sams://${screen.toLowerCase()}`;
    
    if (params) {
      const paramString = Object.keys(params)
        .map(key => `${key}=${params[key]}`)
        .join('&');
      
      if (paramString) {
        url += `?${paramString}`;
      }
    }

    return url;
  },
};

// Widget Appearance Configuration
export const IOSWidgetAppearance = {
  colors: {
    light: {
      background: '#FFFFFF',
      text: '#000000',
      secondaryText: '#666666',
      critical: '#FF3B30',
      warning: '#FF9500',
      success: '#34C759',
      info: '#007AFF',
    },
    dark: {
      background: '#1C1C1E',
      text: '#FFFFFF',
      secondaryText: '#AEAEB2',
      critical: '#FF453A',
      warning: '#FF9F0A',
      success: '#30D158',
      info: '#0A84FF',
    },
  },

  fonts: {
    title: {
      size: 16,
      weight: 'semibold',
    },
    body: {
      size: 14,
      weight: 'regular',
    },
    caption: {
      size: 12,
      weight: 'regular',
    },
    number: {
      size: 24,
      weight: 'bold',
    },
  },

  spacing: {
    small: 4,
    medium: 8,
    large: 16,
  },

  cornerRadius: 8,
};

// Widget Preview Data (for Xcode previews)
export const IOSWidgetPreviewData = {
  small: {
    criticalAlerts: 3,
    totalAlerts: 12,
    serverStatus: 'warning' as const,
    lastUpdate: new Date().toISOString(),
  },

  medium: {
    criticalAlerts: 2,
    totalAlerts: 8,
    serverStatus: 'online' as const,
    lastUpdate: new Date().toISOString(),
    topAlert: {
      title: 'Database Connection Lost',
      severity: 'critical',
      time: '2 min ago',
    },
  },

  large: {
    criticalAlerts: 1,
    totalAlerts: 15,
    serverStatus: 'online' as const,
    lastUpdate: new Date().toISOString(),
    topAlert: {
      title: 'High CPU Usage',
      severity: 'warning',
      time: '5 min ago',
    },
  },
};

export default {
  IOSWidgetDataProvider,
  IOSWidgetConfig,
  IOSWidgetTimeline,
  IOSWidgetIntents,
  IOSWidgetDeepLinks,
  IOSWidgetAppearance,
  IOSWidgetPreviewData,
};
