/**
 * 🚨 Alert Card Component - Alert Display with Actions
 * Professional alert cards with severity indicators and action buttons
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface AlertItem {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'active' | 'acknowledged' | 'resolved';
  serverId: string;
  serverName: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  metadata?: Record<string, any>;
}

interface AlertCardProps {
  alert: AlertItem;
  selected?: boolean;
  selectionMode?: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onAcknowledge: () => void;
  onResolve: () => void;
}

const AlertCard: React.FC<AlertCardProps> = ({
  alert,
  selected = false,
  selectionMode = false,
  onPress,
  onLongPress,
  onAcknowledge,
  onResolve,
}) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#F44336';
      case 'high': return '#FF9800';
      case 'medium': return '#FFC107';
      case 'low': return '#4CAF50';
      default: return '#9E9E9E';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'check-circle';
      default: return 'help';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#F44336';
      case 'acknowledged': return '#FF9800';
      case 'resolved': return '#4CAF50';
      default: return '#9E9E9E';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <TouchableWithoutFeedback onPress={onPress} onLongPress={onLongPress}>
      <View style={[
        styles.container,
        selected && styles.selectedContainer,
        { borderLeftColor: getSeverityColor(alert.severity) }
      ]}>
        {/* Selection indicator */}
        {selectionMode && (
          <View style={styles.selectionIndicator}>
            <Icon 
              name={selected ? 'check-circle' : 'radio-button-unchecked'} 
              size={24} 
              color={selected ? '#2196F3' : '#9E9E9E'} 
            />
          </View>
        )}

        {/* Alert content */}
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.severityContainer}>
              <Icon 
                name={getSeverityIcon(alert.severity)} 
                size={20} 
                color={getSeverityColor(alert.severity)} 
              />
              <Text style={[styles.severity, { color: getSeverityColor(alert.severity) }]}>
                {alert.severity.toUpperCase()}
              </Text>
            </View>
            
            <View style={styles.statusContainer}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(alert.status) }]} />
              <Text style={[styles.status, { color: getStatusColor(alert.status) }]}>
                {alert.status.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Title and description */}
          <Text style={styles.title} numberOfLines={2}>
            {alert.title}
          </Text>
          <Text style={styles.description} numberOfLines={3}>
            {alert.description}
          </Text>

          {/* Server and timestamp */}
          <View style={styles.metadata}>
            <View style={styles.serverInfo}>
              <Icon name="dns" size={16} color="#666" />
              <Text style={styles.serverName}>{alert.serverName}</Text>
            </View>
            <Text style={styles.timestamp}>
              {formatTimestamp(alert.timestamp)}
            </Text>
          </View>

          {/* Acknowledgment info */}
          {alert.acknowledged && alert.acknowledgedBy && (
            <View style={styles.acknowledgmentInfo}>
              <Icon name="person" size={14} color="#666" />
              <Text style={styles.acknowledgmentText}>
                Acknowledged by {alert.acknowledgedBy}
              </Text>
              {alert.acknowledgedAt && (
                <Text style={styles.acknowledgmentTime}>
                  {formatTimestamp(alert.acknowledgedAt)}
                </Text>
              )}
            </View>
          )}

          {/* Action buttons */}
          {!selectionMode && alert.status === 'active' && (
            <View style={styles.actions}>
              {!alert.acknowledged && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.acknowledgeButton]}
                  onPress={(e) => {
                    e.stopPropagation();
                    onAcknowledge();
                  }}
                >
                  <Icon name="check" size={16} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Acknowledge</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[styles.actionButton, styles.resolveButton]}
                onPress={(e) => {
                  e.stopPropagation();
                  onResolve();
                }}
              >
                <Icon name="done-all" size={16} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Resolve</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 15,
    marginVertical: 5,
    borderRadius: 8,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  selectedContainer: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
    borderWidth: 1,
  },
  selectionIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
  content: {
    padding: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  severityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  severity: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  status: {
    fontSize: 12,
    fontWeight: '500',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 10,
  },
  metadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  serverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  serverName: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  acknowledgmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 8,
    borderRadius: 4,
    marginBottom: 10,
  },
  acknowledgmentText: {
    fontSize: 12,
    color: '#E65100',
    marginLeft: 5,
    flex: 1,
  },
  acknowledgmentTime: {
    fontSize: 10,
    color: '#E65100',
    opacity: 0.7,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  acknowledgeButton: {
    backgroundColor: '#FF9800',
  },
  resolveButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
});

export default AlertCard;
