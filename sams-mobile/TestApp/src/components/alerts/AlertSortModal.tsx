import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface AlertSortModalProps {
  visible: boolean;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onApply: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  onClose: () => void;
}

const AlertSortModal: React.FC<AlertSortModalProps> = ({
  visible,
  sortBy,
  sortOrder,
  onApply,
  onClose,
}) => {
  const [localSortBy, setLocalSortBy] = useState(sortBy);
  const [localSortOrder, setLocalSortOrder] = useState(sortOrder);

  const sortOptions = [
    {
      id: 'timestamp',
      label: 'Date & Time',
      icon: 'schedule',
      description: 'Sort by when the alert was created',
    },
    {
      id: 'severity',
      label: 'Severity',
      icon: 'priority-high',
      description: 'Sort by alert severity level',
    },
    {
      id: 'priority',
      label: 'Priority',
      icon: 'flag',
      description: 'Sort by priority score (1-10)',
    },
    {
      id: 'server',
      label: 'Server Name',
      icon: 'dns',
      description: 'Sort alphabetically by server name',
    },
    {
      id: 'category',
      label: 'Category',
      icon: 'label',
      description: 'Sort alphabetically by alert category',
    },
  ];

  const handleApply = () => {
    onApply(localSortBy, localSortOrder);
    onClose();
  };

  const renderSortOption = (option: typeof sortOptions[0]) => {
    const isSelected = localSortBy === option.id;
    
    return (
      <TouchableOpacity
        key={option.id}
        style={[
          styles.sortOption,
          isSelected && styles.sortOptionSelected,
        ]}
        onPress={() => setLocalSortBy(option.id)}
      >
        <View style={styles.sortOptionLeft}>
          <View style={[
            styles.iconContainer,
            isSelected && styles.iconContainerSelected,
          ]}>
            <Icon
              name={option.icon}
              size={20}
              color={isSelected ? '#fff' : '#666'}
            />
          </View>
          
          <View style={styles.sortOptionContent}>
            <Text style={[
              styles.sortOptionLabel,
              isSelected && styles.sortOptionLabelSelected,
            ]}>
              {option.label}
            </Text>
            <Text style={styles.sortOptionDescription}>
              {option.description}
            </Text>
          </View>
        </View>
        
        {isSelected && (
          <Icon name="check" size={20} color="#1976D2" />
        )}
      </TouchableOpacity>
    );
  };

  const renderOrderOption = (order: 'asc' | 'desc', label: string, icon: string) => {
    const isSelected = localSortOrder === order;
    
    return (
      <TouchableOpacity
        style={[
          styles.orderOption,
          isSelected && styles.orderOptionSelected,
        ]}
        onPress={() => setLocalSortOrder(order)}
      >
        <Icon
          name={icon}
          size={20}
          color={isSelected ? '#1976D2' : '#666'}
        />
        <Text style={[
          styles.orderLabel,
          isSelected && styles.orderLabelSelected,
        ]}>
          {label}
        </Text>
        {isSelected && (
          <Icon name="check" size={16} color="#1976D2" />
        )}
      </TouchableOpacity>
    );
  };

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
            <Text style={styles.title}>Sort Alerts</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Sort By Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sort By</Text>
              {sortOptions.map(renderSortOption)}
            </View>

            {/* Sort Order Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sort Order</Text>
              
              <View style={styles.orderContainer}>
                {renderOrderOption('desc', 'Descending', 'arrow-downward')}
                {renderOrderOption('asc', 'Ascending', 'arrow-upward')}
              </View>
              
              <Text style={styles.orderDescription}>
                {localSortBy === 'timestamp' && localSortOrder === 'desc' && 'Newest alerts first'}
                {localSortBy === 'timestamp' && localSortOrder === 'asc' && 'Oldest alerts first'}
                {localSortBy === 'severity' && localSortOrder === 'desc' && 'Critical alerts first'}
                {localSortBy === 'severity' && localSortOrder === 'asc' && 'Info alerts first'}
                {localSortBy === 'priority' && localSortOrder === 'desc' && 'Highest priority first'}
                {localSortBy === 'priority' && localSortOrder === 'asc' && 'Lowest priority first'}
                {localSortBy === 'server' && localSortOrder === 'desc' && 'Z to A'}
                {localSortBy === 'server' && localSortOrder === 'asc' && 'A to Z'}
                {localSortBy === 'category' && localSortOrder === 'desc' && 'Z to A'}
                {localSortBy === 'category' && localSortOrder === 'asc' && 'A to Z'}
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyButtonText}>Apply Sort</Text>
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
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
  },
  sortOptionSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#1976D2',
    borderWidth: 1,
  },
  sortOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconContainerSelected: {
    backgroundColor: '#1976D2',
  },
  sortOptionContent: {
    flex: 1,
  },
  sortOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  sortOptionLabelSelected: {
    color: '#1976D2',
  },
  sortOptionDescription: {
    fontSize: 12,
    color: '#666',
  },
  orderContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  orderOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    backgroundColor: '#f8f9fa',
  },
  orderOptionSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#1976D2',
    borderWidth: 1,
  },
  orderLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 8,
    marginRight: 8,
  },
  orderLabelSelected: {
    color: '#1976D2',
  },
  orderDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  applyButton: {
    flex: 2,
    backgroundColor: '#1976D2',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
  },
  applyButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default AlertSortModal;
