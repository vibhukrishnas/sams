import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface BulkActionModalProps {
  visible: boolean;
  selectedCount: number;
  onAction: (action: string) => void;
  onClose: () => void;
}

const BulkActionModal: React.FC<BulkActionModalProps> = ({
  visible,
  selectedCount,
  onAction,
  onClose,
}) => {
  const actions = [
    {
      id: 'acknowledge',
      label: 'Acknowledge All',
      icon: 'check-circle',
      color: '#4CAF50',
      description: 'Mark all selected alerts as acknowledged',
    },
    {
      id: 'resolve',
      label: 'Resolve All',
      icon: 'done-all',
      color: '#2196F3',
      description: 'Mark all selected alerts as resolved',
    },
    {
      id: 'snooze',
      label: 'Snooze All',
      icon: 'snooze',
      color: '#FF9800',
      description: 'Snooze all selected alerts for 15 minutes',
    },
    {
      id: 'escalate',
      label: 'Escalate All',
      icon: 'trending-up',
      color: '#F44336',
      description: 'Escalate all selected alerts to next level',
    },
    {
      id: 'assign',
      label: 'Assign All',
      icon: 'person-add',
      color: '#9C27B0',
      description: 'Assign all selected alerts to a team member',
    },
    {
      id: 'tag',
      label: 'Add Tags',
      icon: 'label',
      color: '#607D8B',
      description: 'Add tags to all selected alerts',
    },
    {
      id: 'export',
      label: 'Export Data',
      icon: 'file-download',
      color: '#795548',
      description: 'Export selected alerts to CSV or PDF',
    },
    {
      id: 'delete',
      label: 'Delete All',
      icon: 'delete',
      color: '#F44336',
      description: 'Permanently delete all selected alerts',
      destructive: true,
    },
  ];

  const handleAction = (actionId: string) => {
    onAction(actionId);
    onClose();
  };

  const renderAction = (action: typeof actions[0]) => (
    <TouchableOpacity
      key={action.id}
      style={[
        styles.actionItem,
        action.destructive && styles.destructiveAction,
      ]}
      onPress={() => handleAction(action.id)}
    >
      <View style={styles.actionLeft}>
        <View style={[
          styles.actionIcon,
          { backgroundColor: action.color },
        ]}>
          <Icon name={action.icon} size={20} color="#fff" />
        </View>
        
        <View style={styles.actionContent}>
          <Text style={[
            styles.actionLabel,
            action.destructive && styles.destructiveLabel,
          ]}>
            {action.label}
          </Text>
          <Text style={styles.actionDescription}>
            {action.description}
          </Text>
        </View>
      </View>
      
      <Icon name="chevron-right" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Bulk Actions</Text>
              <Text style={styles.subtitle}>
                {selectedCount} alert{selectedCount !== 1 ? 's' : ''} selected
              </Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Available Actions</Text>
            
            {actions.map(renderAction)}
            
            <View style={styles.warningContainer}>
              <Icon name="warning" size={20} color="#FF9800" />
              <Text style={styles.warningText}>
                Bulk actions cannot be undone. Please review your selection carefully.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
  },
  destructiveAction: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FFCDD2',
    borderWidth: 1,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  destructiveLabel: {
    color: '#F44336',
  },
  actionDescription: {
    fontSize: 12,
    color: '#666',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    borderColor: '#FFE0B2',
    borderWidth: 1,
  },
  warningText: {
    fontSize: 12,
    color: '#E65100',
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
});

export default BulkActionModal;
