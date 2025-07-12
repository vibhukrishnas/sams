/**
 * 📶 Offline Status Component
 * Shows connectivity status, cached data, and sync progress
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  ScrollView,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MobileFeatures from '../services/MobileFeatures';

interface OfflineStatusProps {
  onSyncPress?: () => void;
}

interface NetworkState {
  isConnected: boolean;
  type: string;
  isInternetReachable: boolean;
  strength?: number;
}

interface CacheStatus {
  alerts: number;
  servers: number;
  commands: number;
  lastSync: Date | null;
}

const OfflineStatus: React.FC<OfflineStatusProps> = ({ onSyncPress }) => {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isConnected: true,
    type: 'wifi',
    isInternetReachable: true,
  });
  const [cacheStatus, setCacheStatus] = useState<CacheStatus>({
    alerts: 0,
    servers: 0,
    commands: 0,
    lastSync: null,
  });
  const [showDetails, setShowDetails] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(1));

  const mobileFeatures = MobileFeatures.getInstance();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setNetworkState({
        isConnected: state.isConnected ?? false,
        type: state.type,
        isInternetReachable: state.isInternetReachable ?? false,
        strength: state.details?.strength,
      });

      // Animate status change
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.5,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });

    loadCacheStatus();
    
    return () => unsubscribe();
  }, []);

  const loadCacheStatus = async () => {
    try {
      const alerts = await mobileFeatures.getCachedData('alerts');
      const servers = await mobileFeatures.getCachedData('servers');
      const commands = await mobileFeatures.getCachedData('commands');
      
      setCacheStatus({
        alerts: alerts.length,
        servers: servers.length,
        commands: commands.length,
        lastSync: new Date(), // This would come from actual cache metadata
      });
    } catch (error) {
      console.error('Failed to load cache status:', error);
    }
  };

  const handleSync = async () => {
    if (!networkState.isConnected) return;

    setIsSyncing(true);
    setSyncProgress(0);

    try {
      // Simulate sync progress
      const steps = ['Syncing alerts...', 'Syncing servers...', 'Syncing commands...', 'Finalizing...'];
      
      for (let i = 0; i < steps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSyncProgress((i + 1) / steps.length * 100);
      }

      await loadCacheStatus();
      onSyncPress?.();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
      setSyncProgress(0);
    }
  };

  const getConnectionIcon = () => {
    if (!networkState.isConnected) return 'signal-wifi-off';
    
    switch (networkState.type) {
      case 'wifi': return 'wifi';
      case 'cellular': return 'signal-cellular-4-bar';
      case 'ethernet': return 'settings-ethernet';
      default: return 'signal-wifi-4-bar';
    }
  };

  const getConnectionColor = () => {
    if (!networkState.isConnected) return '#FF3366';
    if (!networkState.isInternetReachable) return '#FFA500';
    return '#00FF88';
  };

  const getConnectionText = () => {
    if (!networkState.isConnected) return 'Offline';
    if (!networkState.isInternetReachable) return 'Limited';
    return 'Online';
  };

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const renderStatusBar = () => (
    <Animated.View style={[styles.statusBar, { opacity: fadeAnim }]}>
      <TouchableOpacity
        style={styles.statusContent}
        onPress={() => setShowDetails(true)}
      >
        <Icon 
          name={getConnectionIcon()} 
          size={16} 
          color={getConnectionColor()} 
        />
        <Text style={[styles.statusText, { color: getConnectionColor() }]}>
          {getConnectionText()}
        </Text>
        
        {!networkState.isConnected && (
          <View style={styles.offlineIndicator}>
            <Text style={styles.offlineText}>
              {cacheStatus.alerts + cacheStatus.servers + cacheStatus.commands} cached items
            </Text>
          </View>
        )}

        {mobileFeatures.getSyncQueueLength() > 0 && (
          <View style={styles.syncQueue}>
            <Icon name="sync" size={14} color="#FFA500" />
            <Text style={styles.syncQueueText}>
              {mobileFeatures.getSyncQueueLength()} pending
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {networkState.isConnected && (
        <TouchableOpacity
          style={[styles.syncButton, isSyncing && styles.syncButtonActive]}
          onPress={handleSync}
          disabled={isSyncing}
        >
          <Icon 
            name={isSyncing ? "hourglass-empty" : "sync"} 
            size={16} 
            color={isSyncing ? "#FFA500" : "#00FF88"} 
          />
        </TouchableOpacity>
      )}
    </Animated.View>
  );

  const renderDetailsModal = () => (
    <Modal
      visible={showDetails}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowDetails(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Connection Status</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowDetails(false)}
          >
            <Icon name="close" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Network Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Network Information</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Status:</Text>
                <View style={styles.statusIndicator}>
                  <Icon name={getConnectionIcon()} size={16} color={getConnectionColor()} />
                  <Text style={[styles.infoValue, { color: getConnectionColor() }]}>
                    {getConnectionText()}
                  </Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Type:</Text>
                <Text style={styles.infoValue}>{networkState.type.toUpperCase()}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Internet:</Text>
                <Text style={[
                  styles.infoValue,
                  { color: networkState.isInternetReachable ? '#00FF88' : '#FF3366' }
                ]}>
                  {networkState.isInternetReachable ? 'Reachable' : 'Not Reachable'}
                </Text>
              </View>
              {networkState.strength && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Signal:</Text>
                  <Text style={styles.infoValue}>{networkState.strength}%</Text>
                </View>
              )}
            </View>
          </View>

          {/* Cache Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Offline Data</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Cached Alerts:</Text>
                <Text style={styles.infoValue}>{cacheStatus.alerts}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Cached Servers:</Text>
                <Text style={styles.infoValue}>{cacheStatus.servers}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Cached Commands:</Text>
                <Text style={styles.infoValue}>{cacheStatus.commands}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Last Sync:</Text>
                <Text style={styles.infoValue}>{formatLastSync(cacheStatus.lastSync)}</Text>
              </View>
            </View>
          </View>

          {/* Sync Queue */}
          {mobileFeatures.getSyncQueueLength() > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pending Sync</Text>
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Queued Actions:</Text>
                  <Text style={[styles.infoValue, { color: '#FFA500' }]}>
                    {mobileFeatures.getSyncQueueLength()}
                  </Text>
                </View>
                <Text style={styles.syncNote}>
                  These actions will be synchronized when connection is restored.
                </Text>
              </View>
            </View>
          )}

          {/* Sync Progress */}
          {isSyncing && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Syncing...</Text>
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${syncProgress}%` }]} />
                </View>
                <Text style={styles.progressText}>{Math.round(syncProgress)}%</Text>
              </View>
            </View>
          )}

          {/* Actions */}
          {networkState.isConnected && (
            <View style={styles.section}>
              <TouchableOpacity
                style={[styles.actionButton, isSyncing && styles.actionButtonDisabled]}
                onPress={handleSync}
                disabled={isSyncing}
              >
                <Icon name="sync" size={20} color={isSyncing ? "#666" : "#000"} />
                <Text style={[styles.actionButtonText, isSyncing && styles.actionButtonTextDisabled]}>
                  {isSyncing ? 'Syncing...' : 'Force Sync'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );

  return (
    <>
      {renderStatusBar()}
      {renderDetailsModal()}
    </>
  );
};

const styles = StyleSheet.create({
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  offlineIndicator: {
    marginLeft: 12,
  },
  offlineText: {
    fontSize: 11,
    color: '#666',
  },
  syncQueue: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  syncQueueText: {
    fontSize: 11,
    color: '#FFA500',
    marginLeft: 4,
  },
  syncButton: {
    padding: 8,
  },
  syncButtonActive: {
    opacity: 0.6,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00FF88',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '600',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00FF88',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: 'bold',
    minWidth: 40,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00FF88',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  actionButtonDisabled: {
    backgroundColor: '#333',
  },
  actionButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  actionButtonTextDisabled: {
    color: '#666',
  },
});

export default OfflineStatus;
