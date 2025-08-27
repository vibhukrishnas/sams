import React, { useState } from 'react';
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
import { MaterialIcons } from '@expo/vector-icons';

const ExecuteCommandsScreen: React.FC = () => {
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  const [commandHistory] = useState([
    { command: 'ls -la /var/log/sams', timestamp: '2025-08-27 10:30:00', status: 'success' },
    { command: 'systemctl status sams-backend', timestamp: '2025-08-27 10:25:00', status: 'success' },
    { command: 'tail -n 20 /var/log/sams/error.log', timestamp: '2025-08-27 10:20:00', status: 'success' },
    { command: 'df -h', timestamp: '2025-08-27 10:15:00', status: 'success' },
  ]);

  const predefinedCommands = [
    { title: 'System Status', command: 'systemctl status sams-backend', description: 'Check SAMS backend service status' },
    { title: 'Disk Usage', command: 'df -h', description: 'Check disk space usage' },
    { title: 'Memory Usage', command: 'free -h', description: 'Check memory usage' },
    { title: 'Process List', command: 'ps aux | grep sams', description: 'List SAMS processes' },
    { title: 'Log Tail', command: 'tail -n 50 /var/log/sams/application.log', description: 'View recent log entries' },
    { title: 'Network Status', command: 'netstat -tulpn | grep :8080', description: 'Check network connections' },
  ];

  const executeCommand = async () => {
    if (!command.trim()) {
      Alert.alert('Error', 'Please enter a command');
      return;
    }

    setIsExecuting(true);
    
    // Simulate command execution
    setTimeout(() => {
      const mockOutputs = {
        'systemctl status sams-backend': `● sams-backend.service - SAMS Backend Service
   Loaded: loaded (/etc/systemd/system/sams-backend.service; enabled)
   Active: active (running) since Mon 2025-08-27 08:00:00 UTC; 2h 30min ago
   Main PID: 1234 (java)
   Tasks: 45 (limit: 4915)
   Memory: 512.3M
   CGroup: /system.slice/sams-backend.service
           └─1234 java -jar /opt/sams/sams-backend.jar`,
        
        'df -h': `Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        50G   32G   16G  67% /
/dev/sda2       100G   45G   50G  48% /var
tmpfs           2.0G     0  2.0G   0% /dev/shm`,
        
        'free -h': `               total        used        free      shared  buff/cache   available
Mem:           7.8Gi       3.2Gi       1.1Gi       256Mi       3.5Gi       4.1Gi
Swap:          2.0Gi          0B       2.0Gi`,
        
        'ps aux | grep sams': `root      1234  0.5 12.3 2048000 512000 ?    Ssl  08:00   0:30 java -jar sams-backend.jar
sams      5678  0.2  2.1  128000  85000 ?     S    09:00   0:05 /usr/bin/sams-monitor
root      9012  0.0  0.1   6080   892 pts/0    S+   10:30   0:00 grep --color=auto sams`,
      };

      const result = mockOutputs[command as keyof typeof mockOutputs] || 
        `Command executed: ${command}\nOutput would appear here in a real implementation.`;
      
      setOutput(result);
      setIsExecuting(false);
    }, 2000);
  };

  const selectPredefinedCommand = (cmd: string) => {
    setCommand(cmd);
  };

  const clearOutput = () => {
    setOutput('');
    setCommand('');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Execute Commands</Text>
        <Text style={styles.subtitle}>Run system commands remotely</Text>
      </View>

      <View style={styles.quickActionsContainer}>
        <Text style={styles.sectionTitle}>Quick Commands</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {predefinedCommands.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.quickActionCard}
              onPress={() => selectPredefinedCommand(item.command)}
            >
              <Text style={styles.quickActionTitle}>{item.title}</Text>
              <Text style={styles.quickActionDescription}>{item.description}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.commandContainer}>
        <Text style={styles.sectionTitle}>Command Input</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.commandInput}
            value={command}
            onChangeText={setCommand}
            placeholder="Enter command (e.g., systemctl status sams-backend)"
            multiline
            placeholderTextColor="#95a5a6"
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.executeButton, { opacity: isExecuting ? 0.6 : 1 }]}
              onPress={executeCommand}
              disabled={isExecuting}
            >
              <MaterialIcons name="play-arrow" size={20} color="white" />
              <Text style={styles.executeButtonText}>
                {isExecuting ? 'Executing...' : 'Execute'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.clearButton} onPress={clearOutput}>
              <MaterialIcons name="clear" size={20} color="#7f8c8d" />
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.historyButton} 
              onPress={() => setShowHistory(true)}
            >
              <MaterialIcons name="history" size={20} color="#4a90e2" />
              <Text style={styles.historyButtonText}>History</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {output ? (
        <View style={styles.outputContainer}>
          <Text style={styles.sectionTitle}>Command Output</Text>
          <View style={styles.outputBox}>
            <Text style={styles.outputText}>{output}</Text>
          </View>
        </View>
      ) : null}

      <Modal
        visible={showHistory}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Command History</Text>
            <TouchableOpacity onPress={() => setShowHistory(false)}>
              <MaterialIcons name="close" size={24} color="#2c3e50" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.historyList}>
            {commandHistory.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.historyItem}
                onPress={() => {
                  setCommand(item.command);
                  setShowHistory(false);
                }}
              >
                <Text style={styles.historyCommand}>{item.command}</Text>
                <Text style={styles.historyTimestamp}>{item.timestamp}</Text>
                <View style={[styles.historyStatus, { 
                  backgroundColor: item.status === 'success' ? '#27ae60' : '#e74c3c' 
                }]}>
                  <Text style={styles.historyStatusText}>{item.status}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  quickActionsContainer: {
    padding: 20,
  },
  quickActionCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginRight: 15,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  quickActionDescription: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  commandContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  inputContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  commandInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'monospace',
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  executeButton: {
    backgroundColor: '#27ae60',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  executeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  clearButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  clearButtonText: {
    color: '#7f8c8d',
    fontSize: 16,
    marginLeft: 5,
  },
  historyButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4a90e2',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyButtonText: {
    color: '#4a90e2',
    fontSize: 16,
    marginLeft: 5,
  },
  outputContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  outputBox: {
    backgroundColor: '#2c3e50',
    borderRadius: 10,
    padding: 15,
    minHeight: 200,
  },
  outputText: {
    color: '#ecf0f1',
    fontSize: 14,
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  historyList: {
    flex: 1,
    padding: 20,
  },
  historyItem: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  historyCommand: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#2c3e50',
    marginBottom: 5,
  },
  historyTimestamp: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 5,
  },
  historyStatus: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  historyStatusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
});

export default ExecuteCommandsScreen;
