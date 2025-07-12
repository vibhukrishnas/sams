/**
 * 🏷️ SAMS Server Status Badge Component
 * Real-time server status indicator with enterprise styling
 * 
 * @author SAMS Development Team
 * @version 2.0.0
 */

import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

const ServerStatusBadge = ({ 
  status, 
  size = 'medium', 
  showText = true, 
  animated = true,
  style = {} 
}) => {
  const animatedValue = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (animated && status === 'ONLINE') {
      const pulse = Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]);

      const loop = Animated.loop(pulse);
      loop.start();

      return () => loop.stop();
    }
  }, [status, animated, animatedValue]);

  const getStatusConfig = (status) => {
    switch (status?.toUpperCase()) {
      case 'ONLINE':
        return {
          color: '#10B981', // Green
          backgroundColor: '#D1FAE5',
          borderColor: '#10B981',
          icon: '●',
          text: 'Online',
          textColor: '#065F46'
        };
      case 'OFFLINE':
        return {
          color: '#EF4444', // Red
          backgroundColor: '#FEE2E2',
          borderColor: '#EF4444',
          icon: '●',
          text: 'Offline',
          textColor: '#991B1B'
        };
      case 'ERROR':
        return {
          color: '#F59E0B', // Amber
          backgroundColor: '#FEF3C7',
          borderColor: '#F59E0B',
          icon: '⚠',
          text: 'Error',
          textColor: '#92400E'
        };
      case 'DEPLOYING':
        return {
          color: '#3B82F6', // Blue
          backgroundColor: '#DBEAFE',
          borderColor: '#3B82F6',
          icon: '⟳',
          text: 'Deploying',
          textColor: '#1E40AF'
        };
      case 'NEEDS_DEPLOYMENT':
        return {
          color: '#8B5CF6', // Purple
          backgroundColor: '#EDE9FE',
          borderColor: '#8B5CF6',
          icon: '📦',
          text: 'Setup Required',
          textColor: '#5B21B6'
        };
      case 'UNREACHABLE':
        return {
          color: '#6B7280', // Gray
          backgroundColor: '#F3F4F6',
          borderColor: '#6B7280',
          icon: '✕',
          text: 'Unreachable',
          textColor: '#374151'
        };
      default:
        return {
          color: '#6B7280',
          backgroundColor: '#F3F4F6',
          borderColor: '#6B7280',
          icon: '?',
          text: 'Unknown',
          textColor: '#374151'
        };
    }
  };

  const getSizeConfig = (size) => {
    switch (size) {
      case 'small':
        return {
          containerPadding: 4,
          iconSize: 8,
          fontSize: 10,
          borderRadius: 8,
          minWidth: 60
        };
      case 'large':
        return {
          containerPadding: 12,
          iconSize: 16,
          fontSize: 16,
          borderRadius: 16,
          minWidth: 120
        };
      default: // medium
        return {
          containerPadding: 8,
          iconSize: 12,
          fontSize: 12,
          borderRadius: 12,
          minWidth: 80
        };
    }
  };

  const statusConfig = getStatusConfig(status);
  const sizeConfig = getSizeConfig(size);

  const badgeStyle = [
    styles.badge,
    {
      backgroundColor: statusConfig.backgroundColor,
      borderColor: statusConfig.borderColor,
      paddingHorizontal: sizeConfig.containerPadding,
      paddingVertical: sizeConfig.containerPadding / 2,
      borderRadius: sizeConfig.borderRadius,
      minWidth: sizeConfig.minWidth,
    },
    style
  ];

  const iconStyle = [
    styles.icon,
    {
      color: statusConfig.color,
      fontSize: sizeConfig.iconSize,
    }
  ];

  const textStyle = [
    styles.text,
    {
      color: statusConfig.textColor,
      fontSize: sizeConfig.fontSize,
    }
  ];

  return (
    <Animated.View 
      style={[
        badgeStyle,
        animated && status === 'ONLINE' && {
          transform: [{ scale: animatedValue }]
        }
      ]}
    >
      <View style={styles.content}>
        <Text style={iconStyle}>{statusConfig.icon}</Text>
        {showText && (
          <Text style={textStyle}>{statusConfig.text}</Text>
        )}
      </View>
    </Animated.View>
  );
};

const ServerStatusIndicator = ({ 
  server, 
  showDetails = false, 
  style = {} 
}) => {
  const getLastCheckText = (lastCheck) => {
    if (!lastCheck) return 'Never';
    
    const now = new Date();
    const checkTime = new Date(lastCheck);
    const diffMs = now - checkTime;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <View style={[styles.indicator, style]}>
      <View style={styles.statusRow}>
        <ServerStatusBadge 
          status={server.status} 
          size="medium"
          animated={true}
        />
        {showDetails && (
          <View style={styles.details}>
            <Text style={styles.detailText}>
              Last check: {getLastCheckText(server.lastCheck)}
            </Text>
            {server.agentVersion && (
              <Text style={styles.detailText}>
                Agent: v{server.agentVersion}
              </Text>
            )}
          </View>
        )}
      </View>
      
      {showDetails && server.status === 'ONLINE' && (
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>CPU</Text>
            <Text style={styles.metricValue}>{Math.round(server.cpu || 0)}%</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Memory</Text>
            <Text style={styles.metricValue}>{Math.round(server.memory || 0)}%</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Disk</Text>
            <Text style={styles.metricValue}>{Math.round(server.disk || 0)}%</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const ServerStatusGrid = ({ servers, onServerPress }) => {
  const getStatusCounts = () => {
    const counts = {
      ONLINE: 0,
      OFFLINE: 0,
      ERROR: 0,
      DEPLOYING: 0,
      NEEDS_DEPLOYMENT: 0,
      UNREACHABLE: 0
    };
    
    servers.forEach(server => {
      const status = server.status?.toUpperCase() || 'UNKNOWN';
      if (counts.hasOwnProperty(status)) {
        counts[status]++;
      }
    });
    
    return counts;
  };

  const statusCounts = getStatusCounts();

  return (
    <View style={styles.grid}>
      <View style={styles.gridHeader}>
        <Text style={styles.gridTitle}>Server Status Overview</Text>
        <Text style={styles.gridSubtitle}>
          {servers.length} server{servers.length !== 1 ? 's' : ''} total
        </Text>
      </View>
      
      <View style={styles.statusGrid}>
        {Object.entries(statusCounts).map(([status, count]) => (
          count > 0 && (
            <View key={status} style={styles.statusItem}>
              <ServerStatusBadge 
                status={status} 
                size="small" 
                showText={false}
                animated={false}
              />
              <Text style={styles.statusCount}>{count}</Text>
              <Text style={styles.statusLabel}>
                {status.toLowerCase().replace('_', ' ')}
              </Text>
            </View>
          )
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontWeight: 'bold',
    marginRight: 4,
  },
  text: {
    fontWeight: '600',
  },
  indicator: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  details: {
    flex: 1,
    marginLeft: 12,
  },
  detailText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '500',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
  },
  grid: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gridHeader: {
    marginBottom: 16,
  },
  gridTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  gridSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  statusItem: {
    alignItems: 'center',
    marginBottom: 12,
    minWidth: 80,
  },
  statusCount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 8,
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    textTransform: 'capitalize',
  },
});

export { ServerStatusBadge, ServerStatusIndicator, ServerStatusGrid };
export default ServerStatusBadge;
