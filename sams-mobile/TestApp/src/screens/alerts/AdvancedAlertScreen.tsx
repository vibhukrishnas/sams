import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Voice from '@react-native-voice/voice';
import HapticFeedback from 'react-native-haptic-feedback';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import {
  setAlerts,
  setSearchQuery,
  setFilters,
  setSorting,
  setVoiceRecording,
  setVoiceTranscript,
  processVoiceCommand,
  acknowledgeAlert,
  resolveAlert,
  snoozeAlert,
  toggleBulkSelection,
  clearBulkSelection,
  setViewMode,
  generateAnalytics,
  EnhancedAlert,
} from '../../store/slices/enhancedAlertSlice';
import { showToast } from '../../store/slices/uiSlice';
import AlertFilterModal from '../../components/alerts/AlertFilterModal';
import AlertSortModal from '../../components/alerts/AlertSortModal';
import VoiceCommandModal from '../../components/alerts/VoiceCommandModal';
import BulkActionModal from '../../components/alerts/BulkActionModal';
import AlertListItem from '../../components/alerts/AlertListItem';
import AlertGridItem from '../../components/alerts/AlertGridItem';
import AlertTimelineItem from '../../components/alerts/AlertTimelineItem';
import FloatingActionButton from '../../components/ui/FloatingActionButton';
import SearchBar from '../../components/ui/SearchBar';

const { width } = Dimensions.get('window');

const AdvancedAlertScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  
  const {
    filteredAlerts,
    searchQuery,
    filters,
    sortBy,
    sortOrder,
    voiceRecording,
    voiceTranscript,
    voiceProcessing,
    bulkSelection,
    viewMode,
    isLoading,
    autoRefresh,
  } = useAppSelector(state => state.enhancedAlerts);
  
  const [refreshing, setRefreshing] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<EnhancedAlert | null>(null);

  useEffect(() => {
    setupVoiceRecognition();
    loadAlerts();
    
    if (autoRefresh) {
      const interval = setInterval(loadAlerts, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const setupVoiceRecognition = () => {
    Voice.onSpeechStart = onSpeechStart;
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechError = onSpeechError;
  };

  const onSpeechStart = () => {
    dispatch(setVoiceRecording(true));
    HapticFeedback.trigger('impactLight');
  };

  const onSpeechEnd = () => {
    dispatch(setVoiceRecording(false));
  };

  const onSpeechResults = (event: any) => {
    const transcript = event.value[0];
    dispatch(setVoiceTranscript(transcript));
    
    // Process voice command
    dispatch(processVoiceCommand({ 
      transcript, 
      alertId: selectedAlert?.id 
    }));
  };

  const onSpeechError = (error: any) => {
    console.error('Voice recognition error:', error);
    dispatch(setVoiceRecording(false));
    dispatch(showToast({
      message: 'Voice recognition failed',
      type: 'error',
      duration: 3000,
    }));
  };

  const loadAlerts = async () => {
    try {
      // Mock data - in production, this would fetch from API
      const mockAlerts: EnhancedAlert[] = [
        {
          id: '1',
          title: 'High CPU Usage',
          description: 'CPU usage exceeded 90% threshold',
          severity: 'critical',
          server: 'Web Server 1',
          serverId: 'srv-001',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          acknowledged: false,
          resolved: false,
          category: 'Performance',
          tags: ['cpu', 'performance'],
          priority: 9,
          escalationLevel: 1,
        },
        {
          id: '2',
          title: 'Database Connection Lost',
          description: 'Unable to connect to primary database',
          severity: 'critical',
          server: 'Database Server',
          serverId: 'srv-002',
          timestamp: new Date(Date.now() - 600000).toISOString(),
          acknowledged: true,
          resolved: false,
          acknowledgedBy: 'admin',
          acknowledgedAt: new Date(Date.now() - 300000).toISOString(),
          category: 'Connectivity',
          tags: ['database', 'connection'],
          priority: 10,
          escalationLevel: 2,
          responseTime: 180000,
        },
        {
          id: '3',
          title: 'Disk Space Warning',
          description: 'Disk usage is at 85%',
          severity: 'warning',
          server: 'File Server',
          serverId: 'srv-003',
          timestamp: new Date(Date.now() - 900000).toISOString(),
          acknowledged: false,
          resolved: false,
          category: 'Storage',
          tags: ['disk', 'storage'],
          priority: 6,
          escalationLevel: 1,
        },
      ];
      
      dispatch(setAlerts(mockAlerts));
    } catch (error) {
      console.error('Error loading alerts:', error);
      dispatch(showToast({
        message: 'Failed to load alerts',
        type: 'error',
        duration: 3000,
      }));
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAlerts();
    setRefreshing(false);
    
    HapticFeedback.trigger('impactLight');
    dispatch(showToast({
      message: 'Alerts refreshed',
      type: 'success',
      duration: 2000,
    }));
  }, []);

  const handleSearch = (query: string) => {
    dispatch(setSearchQuery(query));
  };

  const handleVoiceCommand = async () => {
    try {
      setShowVoiceModal(true);
      await Voice.start('en-US');
    } catch (error) {
      console.error('Error starting voice recognition:', error);
      dispatch(showToast({
        message: 'Failed to start voice recognition',
        type: 'error',
        duration: 3000,
      }));
    }
  };

  const handleAlertPress = (alert: EnhancedAlert) => {
    if (bulkSelection.length > 0) {
      dispatch(toggleBulkSelection(alert.id));
      HapticFeedback.trigger('selection');
    } else {
      navigation.navigate('AlertDetails' as never, { alertId: alert.id } as never);
    }
  };

  const handleAlertLongPress = (alert: EnhancedAlert) => {
    dispatch(toggleBulkSelection(alert.id));
    HapticFeedback.trigger('impactMedium');
  };

  const handleQuickAction = async (action: string, alert: EnhancedAlert) => {
    HapticFeedback.trigger('impactLight');
    
    switch (action) {
      case 'acknowledge':
        dispatch(acknowledgeAlert({
          id: alert.id,
          userId: 'current-user',
          notes: 'Quick acknowledged via mobile',
        }));
        break;
      case 'resolve':
        dispatch(resolveAlert({
          id: alert.id,
          userId: 'current-user',
          resolution: 'Quick resolved via mobile',
        }));
        break;
      case 'snooze':
        dispatch(snoozeAlert({
          alertId: alert.id,
          duration: 15 * 60 * 1000, // 15 minutes
          reason: 'Quick snoozed via mobile',
        }));
        break;
    }
  };

  const handleBulkAction = (action: string) => {
    if (bulkSelection.length === 0) return;
    
    Alert.alert(
      'Bulk Action',
      `Apply ${action} to ${bulkSelection.length} selected alerts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            // Process bulk action
            dispatch(clearBulkSelection());
            dispatch(showToast({
              message: `${action} applied to ${bulkSelection.length} alerts`,
              type: 'success',
              duration: 3000,
            }));
          },
        },
      ]
    );
  };

  const renderAlert = ({ item }: { item: EnhancedAlert }) => {
    const isSelected = bulkSelection.includes(item.id);
    
    switch (viewMode) {
      case 'grid':
        return (
          <AlertGridItem
            alert={item}
            isSelected={isSelected}
            onPress={() => handleAlertPress(item)}
            onLongPress={() => handleAlertLongPress(item)}
            onQuickAction={(action) => handleQuickAction(action, item)}
          />
        );
      case 'timeline':
        return (
          <AlertTimelineItem
            alert={item}
            isSelected={isSelected}
            onPress={() => handleAlertPress(item)}
            onLongPress={() => handleAlertLongPress(item)}
            onQuickAction={(action) => handleQuickAction(action, item)}
          />
        );
      default:
        return (
          <AlertListItem
            alert={item}
            isSelected={isSelected}
            onPress={() => handleAlertPress(item)}
            onLongPress={() => handleAlertLongPress(item)}
            onQuickAction={(action) => handleQuickAction(action, item)}
          />
        );
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <SearchBar
        value={searchQuery}
        onChangeText={handleSearch}
        placeholder="Search alerts..."
        style={styles.searchBar}
      />
      
      <View style={styles.headerActions}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Icon name="filter-list" size={24} color="#1976D2" />
          {Object.keys(filters).length > 0 && <View style={styles.filterBadge} />}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setShowSortModal(true)}
        >
          <Icon name="sort" size={24} color="#1976D2" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => dispatch(setViewMode(viewMode === 'list' ? 'grid' : viewMode === 'grid' ? 'timeline' : 'list'))}
        >
          <Icon 
            name={viewMode === 'list' ? 'view-list' : viewMode === 'grid' ? 'view-module' : 'timeline'} 
            size={24} 
            color="#1976D2" 
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderBulkActions = () => {
    if (bulkSelection.length === 0) return null;
    
    return (
      <View style={styles.bulkActions}>
        <Text style={styles.bulkText}>{bulkSelection.length} selected</Text>
        
        <View style={styles.bulkButtons}>
          <TouchableOpacity
            style={styles.bulkButton}
            onPress={() => handleBulkAction('acknowledge')}
          >
            <Icon name="check" size={20} color="#4CAF50" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.bulkButton}
            onPress={() => handleBulkAction('resolve')}
          >
            <Icon name="done-all" size={20} color="#2196F3" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.bulkButton}
            onPress={() => handleBulkAction('snooze')}
          >
            <Icon name="snooze" size={20} color="#FF9800" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.bulkButton}
            onPress={() => dispatch(clearBulkSelection())}
          >
            <Icon name="clear" size={20} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderBulkActions()}
      
      <FlatList
        data={filteredAlerts}
        renderItem={renderAlert}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#1976D2']}
            tintColor="#1976D2"
          />
        }
        numColumns={viewMode === 'grid' ? 2 : 1}
        key={viewMode} // Force re-render when view mode changes
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
      
      <FloatingActionButton
        icon="mic"
        onPress={handleVoiceCommand}
        style={styles.voiceFab}
        backgroundColor={voiceRecording ? '#F44336' : '#1976D2'}
      />
      
      <AlertFilterModal
        visible={showFilterModal}
        filters={filters}
        onApply={(newFilters) => {
          dispatch(setFilters(newFilters));
          setShowFilterModal(false);
        }}
        onClose={() => setShowFilterModal(false)}
      />
      
      <AlertSortModal
        visible={showSortModal}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onApply={(newSortBy, newSortOrder) => {
          dispatch(setSorting({ sortBy: newSortBy, sortOrder: newSortOrder }));
          setShowSortModal(false);
        }}
        onClose={() => setShowSortModal(false)}
      />
      
      <VoiceCommandModal
        visible={showVoiceModal}
        recording={voiceRecording}
        transcript={voiceTranscript}
        processing={voiceProcessing}
        onClose={() => {
          setShowVoiceModal(false);
          Voice.stop();
        }}
      />
      
      <BulkActionModal
        visible={showBulkModal}
        selectedCount={bulkSelection.length}
        onAction={handleBulkAction}
        onClose={() => setShowBulkModal(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchBar: {
    marginBottom: 12,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F44336',
  },
  bulkActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1976D2',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bulkText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bulkButtons: {
    flexDirection: 'row',
  },
  bulkButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 8,
    marginLeft: 8,
  },
  listContainer: {
    padding: 16,
  },
  voiceFab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
});

export default AdvancedAlertScreen;
