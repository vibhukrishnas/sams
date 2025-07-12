/**
 * 🖥️ SAMS Add Server Screen
 * Enterprise server addition with real-time deployment tracking
 * 
 * @author SAMS Development Team
 * @version 2.0.0
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Animated,
  Platform
} from 'react-native';

import ServerAPI from '../api/serverApi';
import { ServerStatusBadge } from '../components/ServerStatusBadge';

const AddServerScreen = ({ visible, onClose, onServerAdded }) => {
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    ip: '',
    username: '',
    password: '',
    type: 'Physical Server',
    location: '',
    description: ''
  });

  // UI state
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentProgress, setDeploymentProgress] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  // Animation
  const progressAnimation = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (deploymentProgress) {
      const progress = deploymentProgress.phases.length / 5; // 5 total phases
      Animated.timing(progressAnimation, {
        toValue: progress,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }
  }, [deploymentProgress]);

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Server name is required';
    }
    
    if (!formData.ip.trim()) {
      errors.ip = 'IP address is required';
    } else {
      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      if (!ipRegex.test(formData.ip)) {
        errors.ip = 'Invalid IP address format';
      }
    }
    
    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    }
    
    if (!formData.password.trim()) {
      errors.password = 'Password is required';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddServer = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the form errors before continuing.');
      return;
    }

    setIsDeploying(true);
    setDeploymentProgress({ phases: [], currentPhase: 'Starting...' });

    try {
      console.log('🚀 Starting server addition process...');
      
      const result = await ServerAPI.addServer(formData);
      
      if (result.success) {
        setDeploymentProgress({
          ...result.operation,
          currentPhase: 'Completed',
          success: true
        });

        setTimeout(() => {
          Alert.alert(
            '🎉 Server Added Successfully!',
            `${formData.name} (${formData.ip}) has been added to SAMS and is now being monitored.\n\n✅ Agent deployed and running\n✅ Real-time monitoring active\n✅ Health checks enabled`,
            [
              {
                text: 'View Server',
                onPress: () => {
                  onServerAdded?.(result.server);
                  handleClose();
                }
              },
              {
                text: 'Add Another',
                onPress: () => {
                  resetForm();
                  setIsDeploying(false);
                  setDeploymentProgress(null);
                }
              }
            ]
          );
        }, 1000);
      } else {
        setDeploymentProgress({
          ...result.operation,
          currentPhase: 'Failed',
          success: false,
          error: result.error
        });

        setTimeout(() => {
          Alert.alert(
            '❌ Server Addition Failed',
            `Failed to add ${formData.name} (${formData.ip}):\n\n${result.error}\n\nPlease check the server configuration and try again.`,
            [
              {
                text: 'Retry',
                onPress: () => {
                  setIsDeploying(false);
                  setDeploymentProgress(null);
                }
              },
              {
                text: 'Cancel',
                onPress: handleClose
              }
            ]
          );
        }, 1000);
      }
    } catch (error) {
      console.log(`❌ Server addition error: ${error.message}`);
      
      setDeploymentProgress({
        phases: [],
        currentPhase: 'Error',
        success: false,
        error: error.message
      });

      setTimeout(() => {
        Alert.alert(
          '❌ Unexpected Error',
          `An unexpected error occurred: ${error.message}`,
          [{ text: 'OK', onPress: handleClose }]
        );
      }, 1000);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      ip: '',
      username: '',
      password: '',
      type: 'Physical Server',
      location: '',
      description: ''
    });
    setValidationErrors({});
  };

  const handleClose = () => {
    resetForm();
    setIsDeploying(false);
    setDeploymentProgress(null);
    onClose?.();
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const renderFormField = (field, label, placeholder, options = {}) => {
    const hasError = validationErrors[field];
    
    return (
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>
          {label} {options.required && <Text style={styles.required}>*</Text>}
        </Text>
        <TextInput
          style={[
            styles.formInput,
            hasError && styles.formInputError
          ]}
          value={formData[field]}
          onChangeText={(value) => updateFormData(field, value)}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          secureTextEntry={options.secure && !showPassword}
          keyboardType={options.keyboardType || 'default'}
          autoCapitalize={options.autoCapitalize || 'none'}
          autoCorrect={false}
          editable={!isDeploying}
        />
        {hasError && (
          <Text style={styles.errorText}>{validationErrors[field]}</Text>
        )}
      </View>
    );
  };

  const renderServerTypeSelector = () => {
    const types = ['Physical Server', 'Virtual Machine', 'Cloud Instance', 'Container'];
    
    return (
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Server Type</Text>
        <View style={styles.typeSelector}>
          {types.map(type => (
            <TouchableOpacity
              key={type}
              style={[
                styles.typeOption,
                formData.type === type && styles.typeOptionSelected
              ]}
              onPress={() => updateFormData('type', type)}
              disabled={isDeploying}
            >
              <Text style={[
                styles.typeOptionText,
                formData.type === type && styles.typeOptionTextSelected
              ]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderDeploymentProgress = () => {
    if (!deploymentProgress) return null;

    const getPhaseStatus = (phase) => {
      if (phase.success) return 'ONLINE';
      if (phase.error) return 'ERROR';
      return 'DEPLOYING';
    };

    return (
      <View style={styles.progressContainer}>
        <Text style={styles.progressTitle}>Deployment Progress</Text>
        
        <View style={styles.progressBar}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
        
        <Text style={styles.currentPhase}>
          {deploymentProgress.currentPhase}
        </Text>
        
        <ScrollView style={styles.phasesList}>
          {deploymentProgress.phases.map((phase, index) => (
            <View key={phase.id} style={styles.phaseItem}>
              <ServerStatusBadge
                status={getPhaseStatus(phase)}
                size="small"
                showText={false}
                animated={false}
              />
              <View style={styles.phaseContent}>
                <Text style={styles.phaseDescription}>
                  {phase.description}
                </Text>
                {phase.error && (
                  <Text style={styles.phaseError}>{phase.error}</Text>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Add New Server</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            disabled={isDeploying}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {isDeploying ? (
          <View style={styles.deploymentContainer}>
            {renderDeploymentProgress()}
          </View>
        ) : (
          <ScrollView style={styles.formContainer}>
            {renderFormField('name', 'Server Name', 'e.g., Web Server 01', { required: true })}
            {renderFormField('ip', 'IP Address', 'e.g., 192.168.1.100', { required: true, keyboardType: 'numeric' })}
            {renderFormField('username', 'Username', 'e.g., administrator', { required: true })}
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                Password <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[
                    styles.formInput,
                    styles.passwordInput,
                    validationErrors.password && styles.formInputError
                  ]}
                  value={formData.password}
                  onChangeText={(value) => updateFormData('password', value)}
                  placeholder="Enter password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.passwordToggleText}>
                    {showPassword ? '🙈' : '👁️'}
                  </Text>
                </TouchableOpacity>
              </View>
              {validationErrors.password && (
                <Text style={styles.errorText}>{validationErrors.password}</Text>
              )}
            </View>

            {renderServerTypeSelector()}
            {renderFormField('location', 'Location', 'e.g., Data Center A')}
            {renderFormField('description', 'Description', 'Brief description of server purpose')}

            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleClose}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.addButton,
                  (!formData.name || !formData.ip || !formData.username || !formData.password) && styles.addButtonDisabled
                ]}
                onPress={handleAddServer}
                disabled={!formData.name || !formData.ip || !formData.username || !formData.password}
              >
                <Text style={styles.addButtonText}>Add Server</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#6B7280',
  },
  formContainer: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#1F2937',
  },
  formInputError: {
    borderColor: '#EF4444',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  passwordToggle: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 4,
  },
  passwordToggleText: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  typeOptionSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  typeOptionText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  typeOptionTextSelected: {
    color: '#FFFFFF',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 40,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  addButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deploymentContainer: {
    flex: 1,
    padding: 20,
  },
  progressContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  currentPhase: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
    textAlign: 'center',
    marginBottom: 20,
  },
  phasesList: {
    maxHeight: 300,
  },
  phaseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  phaseContent: {
    flex: 1,
    marginLeft: 12,
  },
  phaseDescription: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  phaseError: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
});

export default AddServerScreen;
