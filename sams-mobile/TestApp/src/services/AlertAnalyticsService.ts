import { EnhancedAlert, AlertAnalytics, AlertFilter } from '../store/slices/enhancedAlertSlice';

interface TrendDataPoint {
  date: string;
  count: number;
  severity: string;
}

interface CategoryBreakdown {
  category: string;
  count: number;
  percentage: number;
}

interface ServerStats {
  serverId: string;
  serverName: string;
  alertCount: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  avgResponseTime: number;
  avgResolutionTime: number;
}

interface TimeDistribution {
  hour: number;
  count: number;
  percentage: number;
}

interface EscalationStats {
  level: number;
  count: number;
  percentage: number;
  avgTimeToEscalate: number;
}

class AlertAnalyticsService {
  /**
   * Generate comprehensive analytics for alerts
   */
  generateAnalytics(
    alerts: EnhancedAlert[], 
    timeRange: string = '7d',
    filters?: AlertFilter
  ): AlertAnalytics {
    // Filter alerts based on time range and filters
    const filteredAlerts = this.filterAlertsByTimeRange(alerts, timeRange);
    const finalAlerts = filters ? this.applyFilters(filteredAlerts, filters) : filteredAlerts;

    // Calculate basic metrics
    const totalAlerts = finalAlerts.length;
    const criticalAlerts = finalAlerts.filter(a => a.severity === 'critical').length;
    const warningAlerts = finalAlerts.filter(a => a.severity === 'warning').length;
    const infoAlerts = finalAlerts.filter(a => a.severity === 'info').length;
    const resolvedAlerts = finalAlerts.filter(a => a.resolved).length;

    // Calculate response and resolution times
    const { avgResponseTime, avgResolutionTime } = this.calculateTimingMetrics(finalAlerts);

    // Generate trend data
    const trendData = this.generateTrendData(finalAlerts, timeRange);

    // Calculate server statistics
    const topServers = this.calculateServerStats(finalAlerts);

    // Generate category breakdown
    const categoryBreakdown = this.generateCategoryBreakdown(finalAlerts);

    // Calculate hourly distribution
    const hourlyDistribution = this.calculateHourlyDistribution(finalAlerts);

    // Calculate escalation statistics
    const escalationStats = this.calculateEscalationStats(finalAlerts);

    return {
      totalAlerts,
      criticalAlerts,
      warningAlerts,
      infoAlerts,
      resolvedAlerts,
      averageResponseTime: avgResponseTime,
      averageResolutionTime: avgResolutionTime,
      topServers,
      trendData,
      categoryBreakdown,
      hourlyDistribution,
      escalationStats,
    };
  }

  /**
   * Filter alerts by time range
   */
  private filterAlertsByTimeRange(alerts: EnhancedAlert[], timeRange: string): EnhancedAlert[] {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    return alerts.filter(alert => new Date(alert.timestamp) >= startDate);
  }

  /**
   * Apply additional filters to alerts
   */
  private applyFilters(alerts: EnhancedAlert[], filters: AlertFilter): EnhancedAlert[] {
    let filtered = [...alerts];

    if (filters.severity && filters.severity.length > 0) {
      filtered = filtered.filter(alert => filters.severity!.includes(alert.severity));
    }

    if (filters.server && filters.server.length > 0) {
      filtered = filtered.filter(alert => filters.server!.includes(alert.serverId));
    }

    if (filters.category && filters.category.length > 0) {
      filtered = filtered.filter(alert => filters.category!.includes(alert.category));
    }

    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter(alert => {
        if (filters.status!.includes('resolved')) return alert.resolved;
        if (filters.status!.includes('acknowledged')) return alert.acknowledged && !alert.resolved;
        if (filters.status!.includes('unacknowledged')) return !alert.acknowledged;
        return true;
      });
    }

    return filtered;
  }

  /**
   * Calculate timing metrics
   */
  private calculateTimingMetrics(alerts: EnhancedAlert[]): { avgResponseTime: number; avgResolutionTime: number } {
    const responseTimes = alerts
      .filter(alert => alert.responseTime)
      .map(alert => alert.responseTime!);

    const resolutionTimes = alerts
      .filter(alert => alert.resolutionTime)
      .map(alert => alert.resolutionTime!);

    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    const avgResolutionTime = resolutionTimes.length > 0
      ? resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length
      : 0;

    return { avgResponseTime, avgResolutionTime };
  }

  /**
   * Generate trend data for charts
   */
  private generateTrendData(alerts: EnhancedAlert[], timeRange: string): TrendDataPoint[] {
    const trendData: TrendDataPoint[] = [];
    const now = new Date();
    let intervals: Date[] = [];

    // Generate time intervals based on range
    switch (timeRange) {
      case '1h':
        // 10-minute intervals for 1 hour
        for (let i = 6; i >= 0; i--) {
          intervals.push(new Date(now.getTime() - i * 10 * 60 * 1000));
        }
        break;
      case '24h':
        // Hourly intervals for 24 hours
        for (let i = 24; i >= 0; i--) {
          intervals.push(new Date(now.getTime() - i * 60 * 60 * 1000));
        }
        break;
      case '7d':
        // Daily intervals for 7 days
        for (let i = 7; i >= 0; i--) {
          intervals.push(new Date(now.getTime() - i * 24 * 60 * 60 * 1000));
        }
        break;
      case '30d':
        // Daily intervals for 30 days
        for (let i = 30; i >= 0; i--) {
          intervals.push(new Date(now.getTime() - i * 24 * 60 * 60 * 1000));
        }
        break;
    }

    // Count alerts for each interval and severity
    const severities = ['critical', 'warning', 'info'];
    
    for (let i = 0; i < intervals.length - 1; i++) {
      const start = intervals[i];
      const end = intervals[i + 1];
      
      for (const severity of severities) {
        const count = alerts.filter(alert => {
          const alertDate = new Date(alert.timestamp);
          return alertDate >= start && alertDate < end && alert.severity === severity;
        }).length;

        trendData.push({
          date: start.toISOString(),
          count,
          severity,
        });
      }
    }

    return trendData;
  }

  /**
   * Calculate server statistics
   */
  private calculateServerStats(alerts: EnhancedAlert[]): Array<{ serverId: string; serverName: string; alertCount: number }> {
    const serverMap = new Map<string, ServerStats>();

    alerts.forEach(alert => {
      if (!serverMap.has(alert.serverId)) {
        serverMap.set(alert.serverId, {
          serverId: alert.serverId,
          serverName: alert.server,
          alertCount: 0,
          criticalCount: 0,
          warningCount: 0,
          infoCount: 0,
          avgResponseTime: 0,
          avgResolutionTime: 0,
        });
      }

      const stats = serverMap.get(alert.serverId)!;
      stats.alertCount++;

      switch (alert.severity) {
        case 'critical':
          stats.criticalCount++;
          break;
        case 'warning':
          stats.warningCount++;
          break;
        case 'info':
          stats.infoCount++;
          break;
      }
    });

    // Convert to array and sort by alert count
    return Array.from(serverMap.values())
      .sort((a, b) => b.alertCount - a.alertCount)
      .slice(0, 10) // Top 10 servers
      .map(stats => ({
        serverId: stats.serverId,
        serverName: stats.serverName,
        alertCount: stats.alertCount,
      }));
  }

  /**
   * Generate category breakdown
   */
  private generateCategoryBreakdown(alerts: EnhancedAlert[]): CategoryBreakdown[] {
    const categoryMap = new Map<string, number>();

    alerts.forEach(alert => {
      const count = categoryMap.get(alert.category) || 0;
      categoryMap.set(alert.category, count + 1);
    });

    const total = alerts.length;
    return Array.from(categoryMap.entries())
      .map(([category, count]) => ({
        category,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Calculate hourly distribution
   */
  private calculateHourlyDistribution(alerts: EnhancedAlert[]): TimeDistribution[] {
    const hourlyMap = new Map<number, number>();

    // Initialize all hours
    for (let hour = 0; hour < 24; hour++) {
      hourlyMap.set(hour, 0);
    }

    alerts.forEach(alert => {
      const hour = new Date(alert.timestamp).getHours();
      const count = hourlyMap.get(hour) || 0;
      hourlyMap.set(hour, count + 1);
    });

    const total = alerts.length;
    return Array.from(hourlyMap.entries())
      .map(([hour, count]) => ({
        hour,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }));
  }

  /**
   * Calculate escalation statistics
   */
  private calculateEscalationStats(alerts: EnhancedAlert[]): EscalationStats[] {
    const escalationMap = new Map<number, { count: number; totalTime: number }>();

    alerts.forEach(alert => {
      const level = alert.escalationLevel;
      if (!escalationMap.has(level)) {
        escalationMap.set(level, { count: 0, totalTime: 0 });
      }

      const stats = escalationMap.get(level)!;
      stats.count++;

      // Calculate time to escalate (mock calculation)
      if (level > 1) {
        const escalationTime = Math.random() * 3600000; // Random time up to 1 hour
        stats.totalTime += escalationTime;
      }
    });

    const total = alerts.length;
    return Array.from(escalationMap.entries())
      .map(([level, stats]) => ({
        level,
        count: stats.count,
        percentage: Math.round((stats.count / total) * 100),
        avgTimeToEscalate: stats.count > 0 ? stats.totalTime / stats.count : 0,
      }))
      .sort((a, b) => a.level - b.level);
  }

  /**
   * Generate alert frequency predictions
   */
  predictAlertFrequency(alerts: EnhancedAlert[], days: number = 7): number {
    const recentAlerts = this.filterAlertsByTimeRange(alerts, `${days}d`);
    const dailyAverage = recentAlerts.length / days;
    
    // Simple linear prediction (could be enhanced with ML)
    return Math.round(dailyAverage * days);
  }

  /**
   * Calculate alert resolution efficiency
   */
  calculateResolutionEfficiency(alerts: EnhancedAlert[]): number {
    const resolvedAlerts = alerts.filter(alert => alert.resolved);
    const totalAlerts = alerts.length;
    
    if (totalAlerts === 0) return 0;
    
    return Math.round((resolvedAlerts.length / totalAlerts) * 100);
  }

  /**
   * Identify alert patterns
   */
  identifyPatterns(alerts: EnhancedAlert[]): Array<{ pattern: string; frequency: number; impact: string }> {
    const patterns = [];

    // Pattern 1: Recurring server issues
    const serverIssues = this.calculateServerStats(alerts);
    const problematicServers = serverIssues.filter(server => server.alertCount > 10);
    
    if (problematicServers.length > 0) {
      patterns.push({
        pattern: `Recurring issues on ${problematicServers.length} servers`,
        frequency: problematicServers.reduce((sum, server) => sum + server.alertCount, 0),
        impact: 'High',
      });
    }

    // Pattern 2: Time-based patterns
    const hourlyDist = this.calculateHourlyDistribution(alerts);
    const peakHours = hourlyDist.filter(hour => hour.percentage > 10);
    
    if (peakHours.length > 0) {
      patterns.push({
        pattern: `Peak alert times: ${peakHours.map(h => `${h.hour}:00`).join(', ')}`,
        frequency: peakHours.reduce((sum, hour) => sum + hour.count, 0),
        impact: 'Medium',
      });
    }

    // Pattern 3: Category clustering
    const categoryBreakdown = this.generateCategoryBreakdown(alerts);
    const dominantCategories = categoryBreakdown.filter(cat => cat.percentage > 30);
    
    if (dominantCategories.length > 0) {
      patterns.push({
        pattern: `Dominant alert categories: ${dominantCategories.map(c => c.category).join(', ')}`,
        frequency: dominantCategories.reduce((sum, cat) => sum + cat.count, 0),
        impact: 'Medium',
      });
    }

    return patterns;
  }
}

export default new AlertAnalyticsService();
