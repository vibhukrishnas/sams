import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {getServerList, addServer, updateServer, removeServer} from '../../utils/storage';

const ServerManagement = () => {
  const [servers, setServers] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingServer, setEditingServer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    ip: '',
    port: '',
    description: '',
  });

  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    try {
      const serverList = await getServerList();
      setServers(serverList);
    } catch (error) {
      console.error('Error loading servers:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadServers();
    setRefreshing(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      ip: '',
      port: '',
      description: '',
    });
    setEditingServer(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (server) => {
    setFormData({
      name: server.name,
      ip: server.ip,
      port: server.port.toString(),
      description: server.description || '',
    });
    setEditingServer(server);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.ip || !formData.port) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const serverData = {
        id: editingServer?.id || Date.now().toString(),
        name: formData.name,
        ip: formData.ip,
        port: parseInt(formData.port),
        description: formData.description,
        status: editingServer?.status || 'offline',
        lastCheck: new Date().toISOString(),
        createdAt: editingServer?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (editingServer) {
        await updateServer(editingServer.id, serverData);
      } else {
        await addServer(serverData);
      }

      setModalVisible(false);
      resetForm();
      await loadServers();
      
      Alert.alert(
        'Success',
        editingServer ? 'Server updated successfully' : 'Server added successfully'
      );
    } catch (error) {
      console.error('Error saving server:', error);
      Alert.alert('Error', 'Failed to save server');
    }
  };

  const handleDelete = (server) => {
    Alert.alert(
      'Delete Server',
      `Are you sure you want to delete "${server.name}"?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeServer(server.id);
              await loadServers();
              Alert.alert('Success', 'Server deleted successfully');
            } catch (error) {
              console.error('Error deleting server:', error);
              Alert.alert('Error', 'Failed to delete server');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return '#059669';
      case 'offline':
        return '#dc2626';
      case 'warning':
        return '#ea580c';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online':
        return 'check-circle';
      case 'offline':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'help';
    }
  };

  const renderServerCard = (server) => (
    <View key={server.id} style={styles.serverCard}>
      <View style={styles.serverHeader}>
        <View style={styles.serverInfo}>
          <Text style={styles.serverName}>{server.name}</Text>
          <Text style={styles.serverAddress}>
            {server.ip}:{server.port}
          </Text>
        </View>
        <View style={styles.serverStatus}>
          <Icon
            name={getStatusIcon(server.status)}
            size={24}
            color={getStatusColor(server.status)}
          />
          <Text style={[styles.statusText, {color: getStatusColor(server.status)}]}>
            {server.status}
          </Text>
        </View>
      </View>
      
      {server.description && (
        <Text style={styles.serverDescription}>{server.description}</Text>
      )}
      
      <View style={styles.serverFooter}>
        <Text style={styles.lastCheck}>
          Last check: {new Date(server.lastCheck).toLocaleString()}
        </Text>
        <View style={styles.serverActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openEditModal(server)}>
            <Icon name="edit" size={20} color="#1e3a8a" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDelete(server)}>
            <Icon name="delete" size={20} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Server Management</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Icon name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Server List */}
      <ScrollView
        style={styles.serverList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {servers.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="dns" size={64} color="#9ca3af" />
            <Text style={styles.emptyTitle}>No Servers Found</Text>
            <Text style={styles.emptyMessage}>
              Add your first server to start monitoring
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={openAddModal}>
              <Text style={styles.emptyButtonText}>Add Server</Text>
            </TouchableOpacity>
          </View>
        ) : (
          servers.map(renderServerCard)
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingServer ? 'Edit Server' : 'Add Server'}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}>
                <Icon name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Server Name *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => setFormData({...formData, name: text})}
                  placeholder="Enter server name"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>IP Address *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.ip}
                  onChangeText={(text) => setFormData({...formData, ip: text})}
                  placeholder="192.168.1.1"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Port *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.port}
                  onChangeText={(text) => setFormData({...formData, port: text})}
                  placeholder="22"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.description}
                  onChangeText={(text) => setFormData({...formData, description: text})}
                  placeholder="Optional description"
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  addButton: {
    backgroundColor: '#1e3a8a',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serverList: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  serverCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  serverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  serverInfo: {
    flex: 1,
  },
  serverName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  serverAddress: {
    fontSize: 14,
    color: '#6b7280',
  },
  serverStatus: {
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  serverDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  serverFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastCheck: {
    fontSize: 12,
    color: '#9ca3af',
  },
  serverActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  deleteButton: {
    // Additional styling if needed
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    padding: 4,
  },
  form: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ServerManagement; 