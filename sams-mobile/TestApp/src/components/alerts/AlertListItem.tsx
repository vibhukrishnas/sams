import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { EnhancedAlert } from '../../store/slices/enhancedAlertSlice';

interface AlertListItemProps {
  alert: EnhancedAlert;
  isSelected: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onQuickAction: (action: string) => void;
}

const AlertListItem: React.FC<AlertListItemProps> = ({
  alert,
  isSelected,
  onPress,
  onLongPress,
  onQuickAction,
}) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#F44336';
      case 'warning': return '#FF9800';
      case 'info': return '#2196F3';
      default: return '#9E9E9E';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'notifications';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getPriorityIndicator = (priority: number) => {
    if (priority >= 8) return { color: '#F44336', text: 'HIGH' };
    if (priority >= 5) return { color: '#FF9800', text: 'MED' };
    return { color: '#4CAF50', text: 'LOW' };
  };

  const isOverdue = () => {
    if (!alert.reminderAt) return false;
    return new Date(alert.reminderAt) < new Date();
  };

  const isSnoozed = () => {
    if (!alert.snoozedUntil) return false;
    return new Date(alert.snoozedUntil) > new Date();
  };

  const priorityInfo = getPriorityIndicator(alert.priority);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isSelected && styles.selected,
        alert.resolved && styles.resolved,
        isOverdue() && styles.overdue,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      {/* Selection indicator */}
      {isSelected && (
        <View style={styles.selectionIndicator}>
          <Icon name="check-circle" size={20} color="#1976D2" />
        </View>
      )}

      {/* Severity indicator */}
      <View style={styles.leftSection}>
        <View style={[
          styles.severityIndicator,
          { backgroundColor: getSeverityColor(alert.severity) }
        ]}>
          <Icon
            name={getSeverityIcon(alert.severity)}
            size={20}
            color="#fff"
          />
        </View>
        
        {/* Priority badge */}
        <View style={[styles.priorityBadge, { backgroundColor: priorityInfo.color }]}>
          <Text style={styles.priorityText}>{priorityInfo.text}</Text>
        </View>
      </View>

      {/* Main content */}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {alert.title}
          </Text>
          <Text style={styles.timestamp}>
            {formatTime(alert.timestamp)}
          </Text>
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {alert.description}
        </Text>

        <View style={styles.metadata}>
          <View style={styles.serverInfo}>
            <Icon name="dns" size={14} color="#666" />
            <Text style={styles.serverText}>{alert.server}</Text>
          </View>
          
          <View style={styles.categoryInfo}>
            <Icon name="label" size={14} color="#666" />
            <Text style={styles.categoryText}>{alert.category}</Text>
          </View>
        </View>

        {/* Tags */}
        {alert.tags.length > 0 && (
          <View style={styles.tags}>
            {alert.tags.slice(0, 3).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
            {alert.tags.length > 3 && (
              <Text style={styles.moreTagsText}>+{alert.tags.length - 3}</Text>
            )}
          </View>
        )}

        {/* Status indicators */}
        <View style={styles.statusRow}>
          {alert.acknowledged && (
            <View style={styles.statusBadge}>
              <Icon name="check-circle" size={12} color="#4CAF50" />
              <Text style={styles.statusText}>ACK</Text>
            </View>
          )}
          
          {alert.resolved && (
            <View style={[styles.statusBadge, { backgroundColor: '#4CAF50' }]}>
              <Icon name="done-all" size={12} color="#fff" />
              <Text style={[styles.statusText, { color: '#fff' }]}>RESOLVED</Text>
            </View>
          )}
          
          {isSnoozed() && (
            <View style={[styles.statusBadge, { backgroundColor: '#FF9800' }]}>
              <Icon name="snooze" size={12} color="#fff" />
              <Text style={[styles.statusText, { color: '#fff' }]}>SNOOZED</Text>
            </View>
          )}
          
          {alert.escalationLevel > 1 && (
            <View style={[styles.statusBadge, { backgroundColor: '#F44336' }]}>
              <Icon name="trending-up" size={12} color="#fff" />
              <Text style={[styles.statusText, { color: '#fff' }]}>L{alert.escalationLevel}</Text>
            </View>
          )}
          
          {alert.voiceNotes && alert.voiceNotes.length > 0 && (
            <View style={styles.statusBadge}>
              <Icon name="mic" size={12} color="#9C27B0" />
              <Text style={styles.statusText}>{alert.voiceNotes.length}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Quick actions */}
      {!alert.resolved && (
        <View style={styles.quickActions}>
          {!alert.acknowledged && (
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: '#4CAF50' }]}
              onPress={() => onQuickAction('acknowledge')}
            >
              <Icon name="check" size={16} color="#fff" />
            </TouchableOpacity>
          )}
          
          {alert.acknowledged && !alert.resolved && (
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: '#2196F3' }]}
              onPress={() => onQuickAction('resolve')}
            >
              <Icon name="done-all" size={16} color="#fff" />
            </TouchableOpacity>
          )}
          
          {!isSnoozed() && (
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: '#FF9800' }]}
              onPress={() => onQuickAction('snooze')}
            >
              <Icon name="snooze" size={16} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
  },
  selected: {
    borderColor: '#1976D2',
    borderWidth: 2,
    backgroundColor: '#E3F2FD',
  },
  resolved: {
    opacity: 0.7,
    backgroundColor: '#F1F8E9',
  },
  overdue: {
    borderLeftColor: '#F44336',
  },
  selectionIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
  },
  leftSection: {
    alignItems: 'center',
    marginRight: 12,
  },
  severityIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  metadata: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  serverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  serverText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  tag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 10,
    color: '#666',
  },
  moreTagsText: {
    fontSize: 10,
    color: '#999',
    alignSelf: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 10,
    color: '#666',
    marginLeft: 2,
    fontWeight: '600',
  },
  quickActions: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  quickActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
});

export default AlertListItem;
