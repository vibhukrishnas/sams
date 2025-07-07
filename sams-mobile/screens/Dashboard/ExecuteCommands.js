import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {getCommands, addCommand} from '../../utils/storage';

const ExecuteCommands = () => {
  const [command, setCommand] = useState('');
  const [selectedServer, setSelectedServer] = useState('');
  const [commandHistory, setCommandHistory] = useState([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [servers] = useState([
    {id: '1', name: 'Web Server', ip: '192.168.1.10'},
    {id: '2', name: 'Database Server', ip: '192.168.1.11'},
    {id: '3', name: 'File Server', ip: '192.168.1.12'},
  ]);

  useEffect(() => {
    loadCommandHistory();
  }, []);

  const loadCommandHistory = async () => {
    try {
      const history = await getCommands();
      setCommandHistory(history);
    } catch (error) {
      console.error('Error loading command history:', error);
    }
  };

  const executeCommand = async () => {
    if (!command.trim()) {
      Alert.alert('Error', 'Please enter a command');
      return;
    }

    if (!selectedServer) {
      Alert.alert('Error', 'Please select a server');
      return;
    }

    setIsExecuting(true);

    try {
      // Simulate command execution
      await new Promise(resolve => setTimeout(resolve, 2000));

      const commandResult = {
        id: Date.now().toString(),
        command: command,
        server: selectedServer,
        status: Math.random() > 0.3 ? 'success' : 'error',
        output: Math.random() > 0.3 
          ? 'Command executed successfully'
          : 'Permission denied or command not found',
        timestamp: new Date().toISOString(),
      };

      await addCommand(commandResult);
      await loadCommandHistory();

      Alert.alert(
        commandResult.status === 'success' ? 'Success' : 'Error',
        commandResult.output
      );

      setCommand('');
    } catch (error) {
      Alert.alert('Error', 'Failed to execute command');
    } finally {
      setIsExecuting(false);
    }
  };

  const renderCommandHistory = () => {
    return commandHistory.slice(0, 10).map((item) => (
      <View key={item.id} style={styles.historyItem}>
        <View style={styles.historyHeader}>
          <Text style={styles.historyCommand}>{item.command}</Text>
          <View style={styles.historyStatus}>
            <Icon
              name={item.status === 'success' ? 'check-circle' : 'error'}
              size={16}
              color={item.status === 'success' ? '#059669' : '#dc2626'}
            />
            <Text
              style={[
                styles.statusText,
                {color: item.status === 'success' ? '#059669' : '#dc2626'},
              ]}>
              {item.status}
            </Text>
          </View>
        </View>
        <Text style={styles.historyServer}>Server: {item.server}</Text>
        <Text style={styles.historyOutput}>{item.output}</Text>
        <Text style={styles.historyTime}>
          {new Date(item.timestamp).toLocaleString()}
        </Text>
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Execute Commands</Text>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => setModalVisible(true)}>
          <Icon name="history" size={24} color="#1e3a8a" />
        </TouchableOpacity>
      </View>

      {/* Command Input */}
      <View style={styles.inputSection}>
        <View style={styles.serverSelector}>
          <Text style={styles.label}>Select Server:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {servers.map((server) => (
              <TouchableOpacity
                key={server.id}
                style={[
                  styles.serverOption,
                  selectedServer === server.name && styles.selectedServer,
                ]}
                onPress={() => setSelectedServer(server.name)}>
                <Text
                  style={[
                    styles.serverOptionText,
                    selectedServer === server.name && styles.selectedServerText,
                  ]}>
                  {server.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.commandInput}>
          <Text style={styles.label}>Command:</Text>
          <TextInput
            style={styles.input}
            value={command}
            onChangeText={setCommand}
            placeholder="Enter command (e.g., ls -la, ps aux, df -h)"
            multiline
            numberOfLines={3}
          />
        </View>

        <TouchableOpacity
          style={[styles.executeButton, isExecuting && styles.executingButton]}
          onPress={executeCommand}
          disabled={isExecuting}>
          <Icon
            name={isExecuting ? 'hourglass-empty' : 'play-arrow'}
            size={24}
            color="#ffffff"
          />
          <Text style={styles.executeButtonText}>
            {isExecuting ? 'Executing...' : 'Execute Command'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quick Commands */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Commands</Text>
        <View style={styles.quickCommands}>
          {[
            {command: 'ls -la', description: 'List files'},
            {command: 'ps aux', description: 'Process status'},
            {command: 'df -h', description: 'Disk usage'},
            {command: 'free -h', description: 'Memory usage'},
            {command: 'uptime', description: 'System uptime'},
            {command: 'top', description: 'System monitor'},
          ].map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.quickCommand}
              onPress={() => setCommand(item.command)}>
              <Text style={styles.quickCommandText}>{item.command}</Text>
              <Text style={styles.quickCommandDesc}>{item.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Command History Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Command History</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}>
                <Icon name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.historyList}>
              {commandHistory.length === 0 ? (
                <Text style={styles.emptyHistory}>No command history</Text>
              ) : (
                renderCommandHistory()
              )}
            </ScrollView>
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
  historyButton: {
    padding: 8,
  },
  inputSection: {
    padding: 20,
    backgroundColor: '#ffffff',
    margin: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  serverSelector: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  serverOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  selectedServer: {
    backgroundColor: '#1e3a8a',
  },
  serverOptionText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  selectedServerText: {
    color: '#ffffff',
  },
  commandInput: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
    textAlignVertical: 'top',
  },
  executeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e3a8a',
    paddingVertical: 16,
    borderRadius: 8,
  },
  executingButton: {
    backgroundColor: '#6b7280',
  },
  executeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  section: {
    margin: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  quickCommands: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickCommand: {
    width: '48%',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
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
  quickCommandText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  quickCommandDesc: {
    fontSize: 12,
    color: '#6b7280',
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
    width: '90%',
    height: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    padding: 4,
  },
  historyList: {
    flex: 1,
    padding: 20,
  },
  emptyHistory: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 16,
    marginTop: 40,
  },
  historyItem: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyCommand: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  historyStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  historyServer: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  historyOutput: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  historyTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
});

export default ExecuteCommands; 