import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { EnhancedAlert } from '../../store/slices/enhancedAlertSlice';

interface AlertTimelineItemProps {
  alert: EnhancedAlert;
  isSelected: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onQuickAction: (action: string) => void;
}

const AlertTimelineItem: React.FC<AlertTimelineItemProps> = ({
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
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const getTimelineEvents = () => {
    const events = [
      {
        type: 'created',
        timestamp: alert.timestamp,
        icon: 'add-alert',
        color: getSeverityColor(alert.severity),
        title: 'Alert Created',
        description: alert.title,
      },
    ];

    if (alert.acknowledgedAt) {
      events.push({
        type: 'acknowledged',
        timestamp: alert.acknowledgedAt,
        icon: 'check-circle',
        color: '#4CAF50',
        title: 'Acknowledged',
        description: `By ${alert.acknowledgedBy}`,
      });
    }

    if (alert.resolvedAt) {
      events.push({
        type: 'resolved',
        timestamp: alert.resolvedAt,
        icon: 'done-all',
        color: '#2196F3',
        title: 'Resolved',
        description: `By ${alert.resolvedBy}`,
      });
    }

    if (alert.snoozedUntil && new Date(alert.snoozedUntil) > new Date()) {
      events.push({
        type: 'snoozed',
        timestamp: alert.snoozedUntil,
        icon: 'snooze',
        color: '#FF9800',
        title: 'Snoozed',
        description: `Until ${formatTime(alert.snoozedUntil)}`,
      });
    }

    return events.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  };

  const isSnoozed = () => {
    if (!alert.snoozedUntil) return false;
    return new Date(alert.snoozedUntil) > new Date();
  };

  const events = getTimelineEvents();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isSelected && styles.selected,
        alert.resolved && styles.resolved,
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

      {/* Date header */}
      <View style={styles.dateHeader}>
        <Text style={styles.dateText}>
          {formatDate(alert.timestamp)}
        </Text>
        
        <View style={styles.headerActions}>
          {alert.escalationLevel > 1 && (
            <View style={[styles.escalationBadge, { backgroundColor: '#F44336' }]}>
              <Icon name="trending-up" size={12} color="#fff" />
              <Text style={styles.escalationText}>L{alert.escalationLevel}</Text>
            </View>
          )}
          
          {alert.voiceNotes && alert.voiceNotes.length > 0 && (
            <View style={[styles.voiceBadge, { backgroundColor: '#9C27B0' }]}>
              <Icon name="mic" size={12} color="#fff" />
              <Text style={styles.voiceCount}>{alert.voiceNotes.length}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Timeline */}
      <View style={styles.timeline}>
        {events.map((event, index) => (
          <View key={index} style={styles.timelineItem}>
            {/* Timeline line */}
            {index < events.length - 1 && (
              <View style={styles.timelineLine} />
            )}
            
            {/* Timeline dot */}
            <View style={[
              styles.timelineDot,
              { backgroundColor: event.color }
            ]}>
              <Icon name={event.icon} size={12} color="#fff" />
            </View>
            
            {/* Event content */}
            <View style={styles.eventContent}>
              <View style={styles.eventHeader}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventTime}>
                  {formatTime(event.timestamp)}
                </Text>
              </View>
              
              <Text style={styles.eventDescription} numberOfLines={2}>
                {event.description}
              </Text>
              
              {event.type === 'created' && (
                <View style={styles.alertDetails}>
                  <View style={styles.serverInfo}>
                    <Icon name="dns" size={14} color="#666" />
                    <Text style={styles.serverText}>{alert.server}</Text>
                  </View>
                  
                  <View style={styles.categoryInfo}>
                    <Icon name="label" size={14} color="#666" />
                    <Text style={styles.categoryText}>{alert.category}</Text>
                  </View>
                  
                  <View style={styles.priorityInfo}>
                    <Icon name="priority-high" size={14} color="#666" />
                    <Text style={styles.priorityText}>Priority {alert.priority}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        ))}
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
              <Text style={styles.quickActionText}>ACK</Text>
            </TouchableOpacity>
          )}
          
          {alert.acknowledged && !alert.resolved && (
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: '#2196F3' }]}
              onPress={() => onQuickAction('resolve')}
            >
              <Icon name="done-all" size={16} color="#fff" />
              <Text style={styles.quickActionText}>RESOLVE</Text>
            </TouchableOpacity>
          )}
          
          {!isSnoozed() && (
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: '#FF9800' }]}
              onPress={() => onQuickAction('snooze')}
            >
              <Icon name="snooze" size={16} color="#fff" />
              <Text style={styles.quickActionText}>SNOOZE</Text>
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
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
  selectionIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
  },
  escalationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  escalationText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 2,
  },
  voiceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  voiceCount: {
    fontSize: 10,
    color: '#fff',
    marginLeft: 2,
  },
  timeline: {
    marginBottom: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    position: 'relative',
    marginBottom: 16,
  },
  timelineLine: {
    position: 'absolute',
    left: 11,
    top: 24,
    bottom: -16,
    width: 2,
    backgroundColor: '#e0e0e0',
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    zIndex: 1,
  },
  eventContent: {
    flex: 1,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  eventTime: {
    fontSize: 12,
    color: '#999',
  },
  eventDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  alertDetails: {
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 6,
  },
  serverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  serverText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  priorityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 2,
    justifyContent: 'center',
  },
  quickActionText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default AlertTimelineItem;
