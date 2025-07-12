import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';

const { width, height } = Dimensions.get('window');

interface VoiceCommandModalProps {
  visible: boolean;
  recording: boolean;
  transcript: string;
  processing: boolean;
  onClose: () => void;
}

const VoiceCommandModal: React.FC<VoiceCommandModalProps> = ({
  visible,
  recording,
  transcript,
  processing,
  onClose,
}) => {
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const waveAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (recording) {
      startPulseAnimation();
      startWaveAnimation();
    } else {
      stopAnimations();
    }
  }, [recording]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const startWaveAnimation = () => {
    Animated.loop(
      Animated.timing(waveAnimation, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  };

  const stopAnimations = () => {
    pulseAnimation.stopAnimation();
    waveAnimation.stopAnimation();
    Animated.timing(pulseAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    Animated.timing(waveAnimation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const renderVoiceVisualizer = () => {
    const waves = Array.from({ length: 5 }, (_, index) => (
      <Animated.View
        key={index}
        style={[
          styles.wave,
          {
            transform: [
              {
                scale: waveAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5 + index * 0.1, 1 + index * 0.2],
                }),
              },
            ],
            opacity: waveAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 0.1],
            }),
          },
        ]}
      />
    ));

    return (
      <View style={styles.visualizerContainer}>
        {waves}
        <Animated.View
          style={[
            styles.microphoneContainer,
            {
              transform: [{ scale: pulseAnimation }],
            },
          ]}
        >
          <LinearGradient
            colors={recording ? ['#F44336', '#D32F2F'] : ['#1976D2', '#1565C0']}
            style={styles.microphoneButton}
          >
            <Icon
              name={recording ? 'mic' : 'mic-off'}
              size={48}
              color="#fff"
            />
          </LinearGradient>
        </Animated.View>
      </View>
    );
  };

  const renderStatus = () => {
    if (processing) {
      return (
        <View style={styles.statusContainer}>
          <Icon name="hourglass-empty" size={24} color="#FF9800" />
          <Text style={styles.statusText}>Processing command...</Text>
        </View>
      );
    }

    if (recording) {
      return (
        <View style={styles.statusContainer}>
          <Icon name="mic" size={24} color="#F44336" />
          <Text style={styles.statusText}>Listening...</Text>
          <Text style={styles.statusSubtext}>Speak your command</Text>
        </View>
      );
    }

    return (
      <View style={styles.statusContainer}>
        <Icon name="mic-off" size={24} color="#9E9E9E" />
        <Text style={styles.statusText}>Tap to start voice command</Text>
        <Text style={styles.statusSubtext}>Say "acknowledge", "resolve", "snooze", etc.</Text>
      </View>
    );
  };

  const renderTranscript = () => {
    if (!transcript) return null;

    return (
      <View style={styles.transcriptContainer}>
        <Text style={styles.transcriptLabel}>You said:</Text>
        <Text style={styles.transcriptText}>"{transcript}"</Text>
      </View>
    );
  };

  const renderCommands = () => (
    <View style={styles.commandsContainer}>
      <Text style={styles.commandsTitle}>Voice Commands:</Text>
      
      <View style={styles.commandsList}>
        <View style={styles.commandItem}>
          <Icon name="check-circle" size={16} color="#4CAF50" />
          <Text style={styles.commandText}>"Acknowledge this alert"</Text>
        </View>
        
        <View style={styles.commandItem}>
          <Icon name="done-all" size={16} color="#2196F3" />
          <Text style={styles.commandText}>"Resolve this alert"</Text>
        </View>
        
        <View style={styles.commandItem}>
          <Icon name="snooze" size={16} color="#FF9800" />
          <Text style={styles.commandText}>"Snooze for 15 minutes"</Text>
        </View>
        
        <View style={styles.commandItem}>
          <Icon name="trending-up" size={16} color="#F44336" />
          <Text style={styles.commandText}>"Escalate this alert"</Text>
        </View>
        
        <View style={styles.commandItem}>
          <Icon name="note" size={16} color="#9C27B0" />
          <Text style={styles.commandText}>"Add note: [your note]"</Text>
        </View>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Voice Command</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {renderVoiceVisualizer()}
          {renderStatus()}
          {renderTranscript()}
          {renderCommands()}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Powered by Speech Recognition
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: height * 0.8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  visualizerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    position: 'relative',
  },
  wave: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: 'rgba(25, 118, 210, 0.3)',
  },
  microphoneContainer: {
    zIndex: 10,
  },
  microphoneButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  statusContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
  },
  statusSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  transcriptContainer: {
    backgroundColor: '#f5f5f5',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  transcriptLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  transcriptText: {
    fontSize: 16,
    color: '#333',
    fontStyle: 'italic',
  },
  commandsContainer: {
    paddingHorizontal: 20,
  },
  commandsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  commandsList: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  commandItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  commandText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});

export default VoiceCommandModal;
