import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator
} from 'react-native';

interface ServersScreenProps {
  servers: any[];
  onRefresh: () => Promise<void>;
  apiService: any;
}

const ServersScreen: React.FC<ServersScreenProps> = ({ servers, onRefresh, apiService }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedServer, setSelectedServer] = useState<any>(null);
  const [newServer, setNewServer] = useState({ name: '', ip: '', port: '22' });
  const [isLoading, setIsLoading] = useState(false);

  const handleAddServer = async (): Promise<void> => {
    if (!newServer.name || !newServer.ip) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      await apiService.makeRequest('/api/v1/servers', {
        method: 'POST',
        body: JSON.stringify(newServer)
      });
      
      setShowAddModal(false);
      setNewServer({ name: '', ip: '', port: '22' });
      await onRefresh();
      Alert.alert('Success', 'Server added successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to add server');
    } finally {
      setIsLoading(false);
    }
  };

  const handleServerAction = (server: any, action: string): void => {
    switch (action) {
      case 'configure':
        setSelectedServer(server);
        setShowConfigModal(true);
        break;
      case 'restart':
        Alert.alert(
          'Restart Server',
          `Are you sure you want to restart ${server.name}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Restart', style: 'destructive', onPress: () => restartServer(server) }
          ]
        );
        break;
      case 'remove':
        Alert.alert(
          'Remove Server',
          `Are you sure you want to remove ${server.name}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: () => removeServer(server) }
          ]
        );
        break;
    }
  };

  const restartServer = async (server: any): Promise<void> => {
    try {
      await apiService.executeCommand('restart-server', { serverId: server.id });
      Alert.alert('Success', `${server.name} restart initiated`);
      await onRefresh();
    } catch (error) {
      Alert.alert('Error', 'Failed to restart server');
    }
  };

  const removeServer = async (server: any): Promise<void> => {
    try {
      await apiService.makeRequest(`/api/v1/servers/${server.id}`, {
        method: 'DELETE'
      });
      Alert.alert('Success', 'Server removed successfully');
      await onRefresh();
    } catch (error) {
      Alert.alert('Error', 'Failed to remove server');
    }
  };

  const applyConfiguration = async (configType: string, option: string): Promise<void> => {
    if (!selectedServer) return;

    setIsLoading(true);
    try {
      await apiService.configureServer(selectedServer.id, {
        configType,
        option
      });
      
      Alert.alert('Success', 'Configuration applied successfully');
      setShowConfigModal(false);
      await onRefresh();
    } catch (error) {
      Alert.alert('Error', 'Failed to apply configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const renderServerCard = (server: any) => (
    <View key={server.id} style={styles.serverCard}>
      <View style={styles.serverHeader}>
        <View style={styles.serverInfo}>
          <Text style={styles.serverName}>{server.name}</Text>
          <Text style={styles.serverIP}>{server.ip}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: server.status === 'online' ? '#10b981' : '#ef4444' }
        ]}>
          <Text style={styles.statusText}>
            {server.status === 'online' ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      <View style={styles.serverMetrics}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>CPU</Text>
          <View style={styles.metricBar}>
            <View style={[
              styles.metricFill,
              { width: `${server.cpu || 0}%`, backgroundColor: getMetricColor(server.cpu || 0) }
            ]} />
          </View>
          <Text style={styles.metricValue}>{server.cpu || 0}%</Text>
        </View>

        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Memory</Text>
          <View style={styles.metricBar}>
            <View style={[
              styles.metricFill,
              { width: `${server.memory || 0}%`, backgroundColor: getMetricColor(server.memory || 0) }
            ]} />
          </View>
          <Text style={styles.metricValue}>{server.memory || 0}%</Text>
        </View>

        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Disk</Text>
          <View style={styles.metricBar}>
            <View style={[
              styles.metricFill,
              { width: `${server.disk || 0}%`, backgroundColor: getMetricColor(server.disk || 0) }
            ]} />
          </View>
          <Text style={styles.metricValue}>{server.disk || 0}%</Text>
        </View>
      </View>

      <View style={styles.serverActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.configButton]}
          onPress={() => handleServerAction(server, 'configure')}
        >
          <Text style={styles.actionButtonText}>⚙️ Configure</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.restartButton]}
          onPress={() => handleServerAction(server, 'restart')}
        >
          <Text style={styles.actionButtonText}>🔄 Restart</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.removeButton]}
          onPress={() => handleServerAction(server, 'remove')}
        >
          <Text style={styles.actionButtonText}>🗑️ Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const getMetricColor = (value: number): string => {
    if (value < 50) return '#10b981';
    if (value < 80) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Server Management</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>+ Add Server</Text>
        </TouchableOpacity>
      </View>

      {/* Servers List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {servers.length > 0 ? (
          servers.map(renderServerCard)
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🖥️</Text>
            <Text style={styles.emptyTitle}>No Servers</Text>
            <Text style={styles.emptySubtitle}>Add servers to start monitoring</Text>
          </View>
        )}
      </ScrollView>

      {/* Add Server Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Server</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Server Name"
              value={newServer.name}
              onChangeText={(text) => setNewServer(prev => ({ ...prev, name: text }))}
            />
            
            <TextInput
              style={styles.input}
              placeholder="IP Address"
              value={newServer.ip}
              onChangeText={(text) => setNewServer(prev => ({ ...prev, ip: text }))}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Port (default: 22)"
              value={newServer.port}
              onChangeText={(text) => setNewServer(prev => ({ ...prev, port: text }))}
              keyboardType="numeric"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleAddServer}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.saveButtonText}>Add Server</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Configuration Modal */}
      <Modal visible={showConfigModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Configure {selectedServer?.name}
            </Text>
            
            <View style={styles.configSection}>
              <Text style={styles.configTitle}>Performance</Text>
              <View style={styles.configOptions}>
                <TouchableOpacity
                  style={styles.configOption}
                  onPress={() => applyConfiguration('performance', 'high_performance')}
                >
                  <Text style={styles.configOptionText}>⚡ High Performance</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.configOption}
                  onPress={() => applyConfiguration('performance', 'balanced')}
                >
                  <Text style={styles.configOptionText}>⚖️ Balanced</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.configSection}>
              <Text style={styles.configTitle}>Security</Text>
              <View style={styles.configOptions}>
                <TouchableOpacity
                  style={styles.configOption}
                  onPress={() => applyConfiguration('security', 'enable_firewall')}
                >
                  <Text style={styles.configOptionText}>🔒 Enable Firewall</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.configOption}
                  onPress={() => applyConfiguration('security', 'update_security')}
                >
                  <Text style={styles.configOptionText}>🛡️ Update Security</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowConfigModal(false)}
            >
              <Text style={styles.cancelButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  addButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600'
  },
  content: {
    flex: 1,
    padding: 16
  },
  serverCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  serverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  serverInfo: {
    flex: 1
  },
  serverName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4
  },
  serverIP: {
    fontSize: 14,
    color: '#6b7280'
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600'
  },
  serverMetrics: {
    marginBottom: 16
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  metricLabel: {
    width: 60,
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500'
  },
  metricBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden'
  },
  metricFill: {
    height: '100%',
    borderRadius: 4
  },
  metricValue: {
    width: 40,
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'right'
  },
  serverActions: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center'
  },
  configButton: {
    backgroundColor: '#3b82f6'
  },
  restartButton: {
    backgroundColor: '#f59e0b'
  },
  removeButton: {
    backgroundColor: '#ef4444'
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600'
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#9ca3af'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 20,
    textAlign: 'center'
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8
  },
  cancelButton: {
    backgroundColor: '#6b7280'
  },
  saveButton: {
    backgroundColor: '#3b82f6'
  },
  cancelButtonText: {
    color: '#ffffff',
    fontWeight: '600'
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '600'
  },
  configSection: {
    marginBottom: 20
  },
  configTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12
  },
  configOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  configOption: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8
  },
  configOptionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500'
  }
});

export default ServersScreen;
