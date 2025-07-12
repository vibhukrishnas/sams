import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { EnhancedAlert } from '../../store/slices/enhancedAlertSlice';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2; // 16px margin on each side + 16px gap

interface AlertGridItemProps {
  alert: EnhancedAlert;
  isSelected: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onQuickAction: (action: string) => void;
}

const AlertGridItem: React.FC<AlertGridItemProps> = ({
  alert,
  isSelected,
  onPress,
  onLongPress,
  onQuickAction,
}) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return ['#F44336', '#D32F2F'];
      case 'warning': return ['#FF9800', '#F57C00'];
      case 'info': return ['#2196F3', '#1976D2'];
      default: return ['#9E9E9E', '#757575'];
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

    if (diffMins < 1) return 'Now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${Math.floor(diffHours / 24)}d`;
  };

  const getPriorityHeight = (priority: number) => {
    // Map priority (1-10) to height (20-60)
    return 20 + (priority / 10) * 40;
  };

  const isSnoozed = () => {
    if (!alert.snoozedUntil) return false;
    return new Date(alert.snoozedUntil) > new Date();
  };

  const severityColors = getSeverityColor(alert.severity);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { width: cardWidth },
        isSelected && styles.selected,
        alert.resolved && styles.resolved,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
    >
      {/* Selection indicator */}
      {isSelected && (
        <View style={styles.selectionIndicator}>
          <Icon name="check-circle" size={16} color="#1976D2" />
        </View>
      )}

      {/* Header with severity gradient */}
      <LinearGradient
        colors={severityColors}
        style={styles.header}
      >
        <Icon
          name={getSeverityIcon(alert.severity)}
          size={20}
          color="#fff"
        />
        <Text style={styles.timestamp}>
          {formatTime(alert.timestamp)}
        </Text>
      </LinearGradient>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {alert.title}
        </Text>
        
        <View style={styles.serverRow}>
          <Icon name="dns" size={12} color="#666" />
          <Text style={styles.serverText} numberOfLines={1}>
            {alert.server}
          </Text>
        </View>

        <View style={styles.categoryRow}>
          <Icon name="label" size={12} color="#666" />
          <Text style={styles.categoryText} numberOfLines={1}>
            {alert.category}
          </Text>
        </View>

        {/* Priority indicator */}
        <View style={styles.priorityContainer}>
          <Text style={styles.priorityLabel}>Priority</Text>
          <View style={styles.priorityBar}>
            <View
              style={[
                styles.priorityFill,
                {
                  height: getPriorityHeight(alert.priority),
                  backgroundColor: alert.priority >= 8 ? '#F44336' : 
                                   alert.priority >= 5 ? '#FF9800' : '#4CAF50',
                },
              ]}
            />
          </View>
          <Text style={styles.priorityValue}>{alert.priority}</Text>
        </View>

        {/* Status badges */}
        <View style={styles.statusContainer}>
          {alert.acknowledged && (
            <View style={[styles.statusBadge, { backgroundColor: '#4CAF50' }]}>
              <Icon name="check" size={10} color="#fff" />
            </View>
          )}
          
          {alert.resolved && (
            <View style={[styles.statusBadge, { backgroundColor: '#2196F3' }]}>
              <Icon name="done-all" size={10} color="#fff" />
            </View>
          )}
          
          {isSnoozed() && (
            <View style={[styles.statusBadge, { backgroundColor: '#FF9800' }]}>
              <Icon name="snooze" size={10} color="#fff" />
            </View>
          )}
          
          {alert.escalationLevel > 1 && (
            <View style={[styles.statusBadge, { backgroundColor: '#F44336' }]}>
              <Text style={styles.escalationText}>L{alert.escalationLevel}</Text>
            </View>
          )}
          
          {alert.voiceNotes && alert.voiceNotes.length > 0 && (
            <View style={[styles.statusBadge, { backgroundColor: '#9C27B0' }]}>
              <Icon name="mic" size={10} color="#fff" />
              <Text style={styles.voiceCount}>{alert.voiceNotes.length}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Quick action button */}
      {!alert.resolved && (
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => {
            if (!alert.acknowledged) {
              onQuickAction('acknowledge');
            } else {
              onQuickAction('resolve');
            }
          }}
        >
          <Icon
            name={!alert.acknowledged ? 'check' : 'done-all'}
            size={16}
            color="#fff"
          />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  selected: {
    borderColor: '#1976D2',
    borderWidth: 2,
  },
  resolved: {
    opacity: 0.7,
  },
  selectionIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    padding: 12,
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    lineHeight: 18,
  },
  serverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  serverText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    flex: 1,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    flex: 1,
  },
  priorityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  priorityLabel: {
    fontSize: 10,
    color: '#999',
    marginRight: 4,
  },
  priorityBar: {
    width: 20,
    height: 60,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    marginRight: 4,
    justifyContent: 'flex-end',
  },
  priorityFill: {
    width: '100%',
    borderRadius: 2,
  },
  priorityValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginRight: 4,
    marginBottom: 2,
  },
  escalationText: {
    fontSize: 8,
    color: '#fff',
    fontWeight: 'bold',
  },
  voiceCount: {
    fontSize: 8,
    color: '#fff',
    marginLeft: 2,
  },
  quickActionButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#1976D2',
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
});

export default AlertGridItem;
