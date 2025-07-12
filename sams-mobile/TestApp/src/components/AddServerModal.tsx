/**
 * ➕ Add/Edit Server Modal
 * Modal for adding new servers or editing existing ones
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface AddServerModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (serverData: any) => void;
  editingServer?: any;
}

const AddServerModal: React.FC<AddServerModalProps> = ({
  visible,
  onClose,
  onSave,
  editingServer
}) => {
  const [formData, setFormData] = useState({
    name: editingServer?.name || '',
    hostname: editingServer?.hostname || '',
    ipAddress: editingServer?.ipAddress || '',
    serverType: editingServer?.serverType || 'Web',
    environment: editingServer?.environment || 'Development',
    osType: editingServer?.osType || 'Ubuntu',
    osVersion: editingServer?.osVersion || '',
    sshUsername: editingServer?.sshCredentials?.username || '',
    sshPort: editingServer?.sshCredentials?.port?.toString() || '22',
    description: editingServer?.description || '',
  });

  const serverTypes = ['Web', 'Database', 'Application', 'Load Balancer', 'Cache'];
  const environments = ['Production', 'Staging', 'Development'];
  const osTypes = ['Ubuntu', 'CentOS', 'RHEL', 'Windows Server', 'Debian'];

  const handleSave = () => {
    // Validation
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Server name is required');
      return;
    }
    if (!formData.ipAddress.trim()) {
      Alert.alert('Error', 'IP address is required');
      return;
    }

    // Create server object
    const serverData = {
      id: editingServer?.id || Date.now().toString(),
      name: formData.name.trim(),
      hostname: formData.hostname.trim() || formData.name.trim().toLowerCase().replace(/\s+/g, '-'),
      ipAddress: formData.ipAddress.trim(),
      serverType: formData.serverType,
      environment: formData.environment,
      osType: formData.osType,
      osVersion: formData.osVersion.trim(),
      status: editingServer?.status || 'offline',
      lastCheck: editingServer?.lastCheck || new Date(),
      uptime: editingServer?.uptime || '0 days, 0 hours',
      cpuUsage: editingServer?.cpuUsage || 0,
      memoryUsage: editingServer?.memoryUsage || 0,
      diskUsage: editingServer?.diskUsage || 0,
      networkIn: editingServer?.networkIn || 0,
      networkOut: editingServer?.networkOut || 0,
      sshCredentials: {
        username: formData.sshUsername.trim(),
        port: parseInt(formData.sshPort) || 22,
      },
      services: editingServer?.services || [],
      tags: editingServer?.tags || [],
    };

    onSave(serverData);
    onClose();
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <LinearGradient
        colors={['#0A0A0A', '#1A1A1A', '#0A0A0A']}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.title}>
            {editingServer ? 'Edit Server' : 'Add New Server'}
          </Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Server Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(value) => updateFormData('name', value)}
                placeholder="e.g., Web Server 01"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Hostname</Text>
              <TextInput
                style={styles.input}
                value={formData.hostname}
                onChangeText={(value) => updateFormData('hostname', value)}
                placeholder="e.g., web01.company.com"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>IP Address *</Text>
              <TextInput
                style={styles.input}
                value={formData.ipAddress}
                onChangeText={(value) => updateFormData('ipAddress', value)}
                placeholder="e.g., 192.168.1.10"
                placeholderTextColor="#666"
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Server Configuration */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Server Configuration</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Server Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.optionRow}>
                  {serverTypes.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.optionButton,
                        formData.serverType === type && styles.optionButtonActive
                      ]}
                      onPress={() => updateFormData('serverType', type)}
                    >
                      <Text style={[
                        styles.optionText,
                        formData.serverType === type && styles.optionTextActive
                      ]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Environment</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.optionRow}>
                  {environments.map((env) => (
                    <TouchableOpacity
                      key={env}
                      style={[
                        styles.optionButton,
                        formData.environment === env && styles.optionButtonActive
                      ]}
                      onPress={() => updateFormData('environment', env)}
                    >
                      <Text style={[
                        styles.optionText,
                        formData.environment === env && styles.optionTextActive
                      ]}>
                        {env}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>

          {/* Operating System */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Operating System</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>OS Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.optionRow}>
                  {osTypes.map((os) => (
                    <TouchableOpacity
                      key={os}
                      style={[
                        styles.optionButton,
                        formData.osType === os && styles.optionButtonActive
                      ]}
                      onPress={() => updateFormData('osType', os)}
                    >
                      <Text style={[
                        styles.optionText,
                        formData.osType === os && styles.optionTextActive
                      ]}>
                        {os}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>OS Version</Text>
              <TextInput
                style={styles.input}
                value={formData.osVersion}
                onChangeText={(value) => updateFormData('osVersion', value)}
                placeholder="e.g., 22.04 LTS"
                placeholderTextColor="#666"
              />
            </View>
          </View>

          {/* SSH Configuration */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SSH Configuration</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>SSH Username</Text>
              <TextInput
                style={styles.input}
                value={formData.sshUsername}
                onChangeText={(value) => updateFormData('sshUsername', value)}
                placeholder="e.g., admin"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>SSH Port</Text>
              <TextInput
                style={styles.input}
                value={formData.sshPort}
                onChangeText={(value) => updateFormData('sshPort', value)}
                placeholder="22"
                placeholderTextColor="#666"
                keyboardType="numeric"
              />
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  saveButton: {
    backgroundColor: '#00FF88',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  form: {
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
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#FFF',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 12,
    color: '#FFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  optionRow: {
    flexDirection: 'row',
  },
  optionButton: {
    backgroundColor: '#1A1A1A',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  optionButtonActive: {
    backgroundColor: '#00FF88',
    borderColor: '#00FF88',
  },
  optionText: {
    color: '#FFF',
    fontSize: 14,
  },
  optionTextActive: {
    color: '#000',
    fontWeight: 'bold',
  },
});

export default AddServerModal;
