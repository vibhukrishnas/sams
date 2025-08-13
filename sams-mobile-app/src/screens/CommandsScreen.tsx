import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors, spacing, typography } from '../theme/theme';

const CommandsScreen: React.FC = () => {
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState('Ready to execute commands...');
  const [isExecuting, setIsExecuting] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);

  const quickCommands = [
    { label: 'Directory', command: 'dir', icon: 'folder' },
    { label: 'IP Config', command: 'ipconfig', icon: 'network-check' },
    { label: 'Network', command: 'netstat -an', icon: 'wifi' },
    { label: 'Processes', command: 'tasklist', icon: 'list' },
    { label: 'System Info', command: 'systeminfo', icon: 'info' },
    { label: 'Disk Space', command: 'wmic logicaldisk get size,freespace,caption', icon: 'storage' },
  ];

  const executeCommand = async (cmd: string = command) => {
    if (!cmd.trim()) {
      Alert.alert('Error', 'Please enter a command');
      return;
    }

    setIsExecuting(true);
    setOutput('Executing command...');

    try {
      // Simulate command execution
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Add to history
      if (!commandHistory.includes(cmd)) {
        setCommandHistory(prev => [cmd, ...prev.slice(0, 9)]);
      }

      // Mock output based on command
      let mockOutput = '';
      if (cmd.includes('dir')) {
        mockOutput = `Directory of C:\\SAMS

2025-08-10  14:30    <DIR>          .
2025-08-10  14:30    <DIR>          ..
2025-08-10  14:25    <DIR>          backend
2025-08-10  14:25    <DIR>          mobile-app
2025-08-10  14:20         2,048 web_dashboard.html
2025-08-10  14:15         1,024 package.json
               2 File(s)          3,072 bytes
               4 Dir(s)  50,123,456,789 bytes free`;
      } else if (cmd.includes('ipconfig')) {
        mockOutput = `Windows IP Configuration

Ethernet adapter Ethernet:
   Connection-specific DNS Suffix  . : 
   IPv4 Address. . . . . . . . . . . : 192.168.1.100
   Subnet Mask . . . . . . . . . . . : 255.255.255.0
   Default Gateway . . . . . . . . . : 192.168.1.1

Wireless LAN adapter Wi-Fi:
   Connection-specific DNS Suffix  . : 
   IPv4 Address. . . . . . . . . . . : 192.168.1.105
   Subnet Mask . . . . . . . . . . . : 255.255.255.0
   Default Gateway . . . . . . . . . : 192.168.1.1`;
      } else if (cmd.includes('netstat')) {
        mockOutput = `Active Connections

  Proto  Local Address          Foreign Address        State
  TCP    0.0.0.0:80             0.0.0.0:0              LISTENING
  TCP    0.0.0.0:443            0.0.0.0:0              LISTENING
  TCP    0.0.0.0:8080           0.0.0.0:0              LISTENING
  TCP    127.0.0.1:3000         0.0.0.0:0              LISTENING
  TCP    192.168.1.100:49152    52.96.228.162:443     ESTABLISHED`;
      } else if (cmd.includes('tasklist')) {
        mockOutput = `Image Name                     PID Session Name        Session#    Mem Usage
========================= ======== ================ =========== ============
System Idle Process              0 Services                   0          8 K
System                           4 Services                   0      2,184 K
smss.exe                       388 Services                   0      1,048 K
csrss.exe                      496 Services                   0      4,692 K
svchost.exe                    720 Services                   0     15,360 K
java.exe                      1234 Console                    1     256,000 K`;
      } else {
        mockOutput = `Command executed successfully: ${cmd}

Output would appear here in a real implementation.
This is a demonstration of the mobile command interface.

System: Windows Server 2022
Backend: Java Spring Boot (Port 8080)
Status: Connected
Timestamp: ${new Date().toLocaleString()}`;
      }

      setOutput(mockOutput);
    } catch (error) {
      setOutput(`Error executing command: ${error}`);
    } finally {
      setIsExecuting(false);
      setCommand('');
    }
  };

  const clearOutput = () => {
    setOutput('Ready to execute commands...');
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[colors.success, '#059669']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Command Executor</Text>
        <Text style={styles.headerSubtitle}>
          Execute system commands remotely
        </Text>
      </LinearGradient>

      {/* Command Input */}
      <View style={styles.inputSection}>
        <Text style={styles.sectionTitle}>Command Input</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.commandInput}
            value={command}
            onChangeText={setCommand}
            placeholder="Enter command (e.g., dir, ipconfig, netstat)"
            placeholderTextColor={colors.textMuted}
            editable={!isExecuting}
            multiline
          />
          <TouchableOpacity
            style={[styles.executeButton, isExecuting && styles.executeButtonDisabled]}
            onPress={() => executeCommand()}
            disabled={isExecuting}
          >
            <LinearGradient
              colors={[colors.success, '#059669']}
              style={styles.executeButtonGradient}
            >
              <Icon 
                name={isExecuting ? "hourglass-empty" : "play-arrow"} 
                size={20} 
                color="#ffffff" 
              />
              <Text style={styles.executeButtonText}>
                {isExecuting ? 'Executing...' : 'Execute'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Commands */}
      <View style={styles.quickCommands}>
        <Text style={styles.sectionTitle}>Quick Commands</Text>
        <View style={styles.commandGrid}>
          {quickCommands.map((cmd, index) => (
            <TouchableOpacity
              key={index}
              style={styles.quickCommandCard}
              onPress={() => executeCommand(cmd.command)}
              disabled={isExecuting}
            >
              <LinearGradient
                colors={[colors.surface, colors.surfaceVariant]}
                style={styles.quickCommandGradient}
              >
                <Icon name={cmd.icon} size={24} color={colors.primary} />
                <Text style={styles.quickCommandText}>{cmd.label}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Command History */}
      {commandHistory.length > 0 && (
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Recent Commands</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.historyContainer}>
              {commandHistory.map((cmd, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.historyItem}
                  onPress={() => setCommand(cmd)}
                >
                  <Text style={styles.historyText}>{cmd}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Output Section */}
      <View style={styles.outputSection}>
        <View style={styles.outputHeader}>
          <Text style={styles.sectionTitle}>Command Output</Text>
          <TouchableOpacity onPress={clearOutput} style={styles.clearButton}>
            <Icon name="clear" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.outputContainer}>
          <ScrollView style={styles.outputScroll}>
            <Text style={styles.outputText}>{output}</Text>
          </ScrollView>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  headerTitle: {
    ...typography.heading1,
    color: '#ffffff',
    fontWeight: '700',
  },
  headerSubtitle: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: spacing.xs,
  },
  inputSection: {
    padding: spacing.md,
  },
  sectionTitle: {
    ...typography.heading3,
    color: colors.text,
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  commandInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    color: colors.text,
    fontSize: 16,
    maxHeight: 100,
    textAlignVertical: 'top',
  },
  executeButton: {
    borderRadius: 12,
    overflow: 'hidden',
    minWidth: 100,
  },
  executeButtonDisabled: {
    opacity: 0.6,
  },
  executeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  executeButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  quickCommands: {
    padding: spacing.md,
  },
  commandGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickCommandCard: {
    width: '48%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  quickCommandGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  quickCommandText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
  },
  historySection: {
    padding: spacing.md,
  },
  historyContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  historyItem: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyText: {
    ...typography.caption,
    color: colors.text,
    fontFamily: 'monospace',
  },
  outputSection: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  outputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  clearButton: {
    padding: spacing.sm,
  },
  outputContainer: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    height: 300,
  },
  outputScroll: {
    flex: 1,
    padding: spacing.md,
  },
  outputText: {
    ...typography.body,
    color: colors.text,
    fontFamily: 'monospace',
    lineHeight: 20,
  },
});

export default CommandsScreen;
