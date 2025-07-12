/**
 * 🚨 Alert List Screen - Alert Management with Offline Support
 * Comprehensive alert management with real-time updates and offline functionality
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Switch,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import PushNotification from 'react-native-push-notification';

// Components
import AlertCard from '../../components/AlertCard';
import FilterModal from '../../components/FilterModal';
import NetworkStatusBanner from '../../components/NetworkStatusBanner';
import EmptyState from '../../components/EmptyState';

// Services
import { fetchAlerts, acknowledgeAlert, resolveAlert, setFilters } from '../../services/InfraService';
import AuthenticationService from '../../services/AuthenticationService';

// Types
import { RootState } from '../../store/store';

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

interface AlertFilters {
  severity: string;
  status: string;
  serverId: string | null;
  dateRange: string;
}

const AlertListScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { alerts, loading, error, filters } = useSelector((state: RootState) => state.alerts);
  const { user } = useSelector((state: RootState) => state.auth);

  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [filteredAlerts, setFilteredAlerts] = useState<AlertItem[]>([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>([]);
  const [bulkActionMode, setBulkActionMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'timestamp' | 'severity' | 'status'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Network status monitoring
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
      if (state.isConnected) {
        handleRefresh();
      }
    });

    return unsubscribe;
  }, []);

  // Focus effect to refresh data
  useFocusEffect(
    useCallback(() => {
      loadAlerts();
    }, [])
  );

  // Filter and sort alerts
  useEffect(() => {
    let filtered = [...alerts];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(alert =>
        alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.serverName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply severity filter
    if (filters.severity !== 'all') {
      filtered = filtered.filter(alert => alert.severity === filters.severity);
    }

    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(alert => alert.status === filters.status);
    }

    // Apply server filter
    if (filters.serverId) {
      filtered = filtered.filter(alert => alert.serverId === filters.serverId);
    }

    // Sort alerts
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'timestamp':
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'severity':
          const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          comparison = severityOrder[a.severity] - severityOrder[b.severity];
          break;
        case 'status':
          const statusOrder = { active: 3, acknowledged: 2, resolved: 1 };
          comparison = statusOrder[a.status] - statusOrder[b.status];
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    setFilteredAlerts(filtered);
  }, [alerts, filters, searchQuery, sortBy, sortOrder]);

  // Load alerts
  const loadAlerts = async () => {
    try {
      if (isOnline) {
        await dispatch(fetchAlerts());
      } else {
        await loadCachedAlerts();
      }
    } catch (error) {
      console.error('❌ Error loading alerts:', error);
      await loadCachedAlerts();
    }
  };

  // Load cached alerts for offline mode
  const loadCachedAlerts = async () => {
    try {
      const cachedAlerts = await AsyncStorage.getItem('cached_alerts');
      if (cachedAlerts) {
        const alertData = JSON.parse(cachedAlerts);
        dispatch(setAlerts(alertData));
      }
    } catch (error) {
      console.error('❌ Error loading cached alerts:', error);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAlerts();
    setRefreshing(false);
  };

  // Handle alert press
  const handleAlertPress = (alertId: string) => {
    if (bulkActionMode) {
      toggleAlertSelection(alertId);
    } else {
      navigation.navigate('AlertDetail', { alertId });
    }
  };

  // Handle alert long press
  const handleAlertLongPress = (alertId: string) => {
    setBulkActionMode(true);
    setSelectedAlerts([alertId]);
  };

  // Toggle alert selection
  const toggleAlertSelection = (alertId: string) => {
    setSelectedAlerts(prev => 
      prev.includes(alertId) 
        ? prev.filter(id => id !== alertId)
        : [...prev, alertId]
    );
  };

  // Handle acknowledge alert
  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      if (isOnline) {
        await dispatch(acknowledgeAlert(alertId));
        
        // Show local notification
        PushNotification.localNotification({
          title: 'Alert Acknowledged',
          message: 'Alert has been acknowledged successfully',
          playSound: false,
        });
      } else {
        // Queue for later when online
        await queueOfflineAction('acknowledge', alertId);
        
        // Update local state
        dispatch(acknowledgeAlert(alertId));
      }
    } catch (error) {
      console.error('❌ Error acknowledging alert:', error);
      Alert.alert('Error', 'Failed to acknowledge alert. Please try again.');
    }
  };

  // Handle resolve alert
  const handleResolveAlert = async (alertId: string) => {
    try {
      if (isOnline) {
        await dispatch(resolveAlert(alertId));
        
        PushNotification.localNotification({
          title: 'Alert Resolved',
          message: 'Alert has been resolved successfully',
          playSound: false,
        });
      } else {
        await queueOfflineAction('resolve', alertId);
        dispatch(resolveAlert(alertId));
      }
    } catch (error) {
      console.error('❌ Error resolving alert:', error);
      Alert.alert('Error', 'Failed to resolve alert. Please try again.');
    }
  };

  // Handle bulk actions
  const handleBulkAction = async (action: 'acknowledge' | 'resolve') => {
    try {
      const promises = selectedAlerts.map(alertId => 
        action === 'acknowledge' 
          ? handleAcknowledgeAlert(alertId)
          : handleResolveAlert(alertId)
      );
      
      await Promise.all(promises);
      
      setSelectedAlerts([]);
      setBulkActionMode(false);
      
      Alert.alert(
        'Success',
        `${selectedAlerts.length} alert(s) ${action === 'acknowledge' ? 'acknowledged' : 'resolved'} successfully`
      );
    } catch (error) {
      console.error(`❌ Error with bulk ${action}:`, error);
      Alert.alert('Error', `Failed to ${action} selected alerts. Please try again.`);
    }
  };

  // Queue offline action
  const queueOfflineAction = async (action: string, alertId: string) => {
    try {
      const offlineActions = await AsyncStorage.getItem('offline_alert_actions') || '[]';
      const actions = JSON.parse(offlineActions);
      
      actions.push({
        action,
        alertId,
        timestamp: Date.now(),
        userId: user?.id,
      });
      
      await AsyncStorage.setItem('offline_alert_actions', JSON.stringify(actions));
    } catch (error) {
      console.error('❌ Error queuing offline action:', error);
    }
  };

  // Handle filter apply
  const handleFilterApply = (newFilters: AlertFilters) => {
    dispatch(setFilters(newFilters));
    setShowFilterModal(false);
  };

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#F44336';
      case 'high': return '#FF9800';
      case 'medium': return '#FFC107';
      case 'low': return '#4CAF50';
      default: return '#9E9E9E';
    }
  };

  // Render alert item
  const renderAlertItem = ({ item }: { item: AlertItem }) => (
    <AlertCard
      alert={item}
      selected={selectedAlerts.includes(item.id)}
      selectionMode={bulkActionMode}
      onPress={() => handleAlertPress(item.id)}
      onLongPress={() => handleAlertLongPress(item.id)}
      onAcknowledge={() => handleAcknowledgeAlert(item.id)}
      onResolve={() => handleResolveAlert(item.id)}
    />
  );

  // Render header
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search alerts..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      <View style={styles.headerActions}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Icon name="filter-list" size={20} color="#2196F3" />
          <Text style={styles.filterText}>Filter</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => {
            // Toggle sort order or show sort options
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
          }}
        >
          <Icon 
            name={sortOrder === 'asc' ? 'arrow-upward' : 'arrow-downward'} 
            size={20} 
            color="#2196F3" 
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render bulk action bar
  const renderBulkActionBar = () => {
    if (!bulkActionMode) return null;

    return (
      <View style={styles.bulkActionBar}>
        <Text style={styles.bulkActionText}>
          {selectedAlerts.length} selected
        </Text>
        <View style={styles.bulkActions}>
          <TouchableOpacity
            style={[styles.bulkActionButton, { backgroundColor: '#FF9800' }]}
            onPress={() => handleBulkAction('acknowledge')}
          >
            <Text style={styles.bulkActionButtonText}>Acknowledge</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bulkActionButton, { backgroundColor: '#4CAF50' }]}
            onPress={() => handleBulkAction('resolve')}
          >
            <Text style={styles.bulkActionButtonText}>Resolve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bulkActionButton, { backgroundColor: '#9E9E9E' }]}
            onPress={() => {
              setBulkActionMode(false);
              setSelectedAlerts([]);
            }}
          >
            <Text style={styles.bulkActionButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {!isOnline && <NetworkStatusBanner />}
      
      {renderHeader()}
      {renderBulkActionBar()}
      
      <FlatList
        data={filteredAlerts}
        renderItem={renderAlertItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#2196F3']}
            tintColor="#2196F3"
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="warning"
            title="No Alerts"
            message={
              searchQuery || filters.severity !== 'all' || filters.status !== 'all'
                ? "No alerts match your current filters"
                : "All systems are running smoothly"
            }
          />
        }
        contentContainerStyle={filteredAlerts.length === 0 ? styles.emptyContainer : undefined}
      />

      {/* Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        filters={filters}
        onApply={handleFilterApply}
        onClose={() => setShowFilterModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 25,
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#E3F2FD',
    borderRadius: 20,
  },
  filterText: {
    marginLeft: 5,
    color: '#2196F3',
    fontWeight: '500',
  },
  sortButton: {
    padding: 8,
    backgroundColor: '#E3F2FD',
    borderRadius: 20,
  },
  bulkActionBar: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  bulkActionText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  bulkActions: {
    flexDirection: 'row',
  },
  bulkActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginLeft: 8,
  },
  bulkActionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
});

export default AlertListScreen;
