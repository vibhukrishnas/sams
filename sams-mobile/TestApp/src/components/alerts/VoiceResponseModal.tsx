import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Voice from '@react-native-voice/voice';
import { getTheme } from '../../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (response: string, isVoice: boolean) => void;
  alertId: string;
  isDark: boolean;
}

const VoiceResponseModal: React.FC<Props> = ({
  visible,
  onClose,
  onSubmit,
  alertId,
  isDark,
}) => {
  const theme = getTheme(isDark);
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [manualText, setManualText] = useState('');
  const [isVoiceMode, setIsVoiceMode] = useState(true);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    Voice.onSpeechStart = onSpeechStart;
    Voice.onSpeechRecognized = onSpeechRecognized;
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechError = onSpeechError;
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechPartialResults = onSpeechPartialResults;

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  useEffect(() => {
    if (isListening) {
      startPulseAnimation();
    } else {
      stopPulseAnimation();
    }
  }, [isListening]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  const onSpeechStart = () => {
    console.log('🎤 Speech recognition started');
    setIsListening(true);
  };

  const onSpeechRecognized = () => {
    console.log('🎤 Speech recognized');
  };

  const onSpeechEnd = () => {
    console.log('🎤 Speech recognition ended');
    setIsListening(false);
  };

  const onSpeechError = (error: any) => {
    console.error('🎤 Speech recognition error:', error);
    setIsListening(false);
    Alert.alert(
      'Voice Recognition Error',
      'Failed to recognize speech. Please try again or use text input.',
      [{ text: 'OK' }]
    );
  };

  const onSpeechResults = (event: any) => {
    const results = event.value;
    if (results && results.length > 0) {
      setVoiceText(results[0]);
    }
  };

  const onSpeechPartialResults = (event: any) => {
    const results = event.value;
    if (results && results.length > 0) {
      setVoiceText(results[0]);
    }
  };

  const startListening = async () => {
    try {
      setVoiceText('');
      await Voice.start('en-US');
    } catch (error) {
      console.error('🎤 Error starting voice recognition:', error);
      Alert.alert(
        'Voice Recognition Error',
        'Failed to start voice recognition. Please check your microphone permissions.',
        [{ text: 'OK' }]
      );
    }
  };

  const stopListening = async () => {
    try {
      await Voice.stop();
    } catch (error) {
      console.error('🎤 Error stopping voice recognition:', error);
    }
  };

  const handleSubmit = () => {
    const response = isVoiceMode ? voiceText : manualText;
    if (response.trim()) {
      onSubmit(response.trim(), isVoiceMode);
      handleClose();
    } else {
      Alert.alert('Empty Response', 'Please provide a response before submitting.');
    }
  };

  const handleClose = () => {
    if (isListening) {
      stopListening();
    }
    setVoiceText('');
    setManualText('');
    setIsVoiceMode(true);
    onClose();
  };

  const quickResponses = [
    'Acknowledged - investigating now',
    'Issue resolved - monitoring for stability',
    'Escalating to senior team',
    'False alarm - no action needed',
    'Scheduled maintenance - expected behavior',
    'Need more information to proceed',
  ];

  const handleQuickResponse = (response: string) => {
    onSubmit(response, false);
    handleClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
            <Icon name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Alert Response
          </Text>
          <View style={styles.headerButton} />
        </View>

        {/* Mode Toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              {
                backgroundColor: isVoiceMode ? theme.colors.primary : theme.colors.surface,
                borderColor: theme.colors.primary,
              },
            ]}
            onPress={() => setIsVoiceMode(true)}
          >
            <Icon
              name="mic"
              size={20}
              color={isVoiceMode ? '#FFFFFF' : theme.colors.text}
            />
            <Text
              style={[
                styles.modeButtonText,
                { color: isVoiceMode ? '#FFFFFF' : theme.colors.text },
              ]}
            >
              Voice
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeButton,
              {
                backgroundColor: !isVoiceMode ? theme.colors.primary : theme.colors.surface,
                borderColor: theme.colors.primary,
              },
            ]}
            onPress={() => setIsVoiceMode(false)}
          >
            <Icon
              name="keyboard"
              size={20}
              color={!isVoiceMode ? '#FFFFFF' : theme.colors.text}
            />
            <Text
              style={[
                styles.modeButtonText,
                { color: !isVoiceMode ? '#FFFFFF' : theme.colors.text },
              ]}
            >
              Text
            </Text>
          </TouchableOpacity>
        </View>

        {/* Voice Mode */}
        {isVoiceMode && (
          <View style={styles.voiceContainer}>
            <Animated.View
              style={[
                styles.microphoneButton,
                {
                  backgroundColor: isListening ? '#F44336' : theme.colors.primary,
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <TouchableOpacity
                style={styles.microphoneTouch}
                onPress={isListening ? stopListening : startListening}
              >
                <Icon
                  name={isListening ? 'stop' : 'mic'}
                  size={40}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </Animated.View>
            
            <Text style={[styles.voiceInstruction, { color: theme.colors.textSecondary }]}>
              {isListening ? 'Listening... Tap to stop' : 'Tap to start recording'}
            </Text>
            
            {voiceText ? (
              <View style={[styles.voiceTextContainer, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.voiceText, { color: theme.colors.text }]}>
                  {voiceText}
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Text Mode */}
        {!isVoiceMode && (
          <View style={styles.textContainer}>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder="Type your response..."
              placeholderTextColor={theme.colors.textSecondary}
              value={manualText}
              onChangeText={setManualText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        )}

        {/* Quick Responses */}
        <View style={styles.quickResponsesContainer}>
          <Text style={[styles.quickResponsesTitle, { color: theme.colors.text }]}>
            Quick Responses
          </Text>
          <View style={styles.quickResponsesGrid}>
            {quickResponses.map((response, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.quickResponseButton,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                ]}
                onPress={() => handleQuickResponse(response)}
              >
                <Text style={[styles.quickResponseText, { color: theme.colors.text }]}>
                  {response}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Submit Button */}
        <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor: theme.colors.primary,
                opacity: (isVoiceMode ? voiceText : manualText).trim() ? 1 : 0.5,
              },
            ]}
            onPress={handleSubmit}
            disabled={!(isVoiceMode ? voiceText : manualText).trim()}
          >
            <Text style={styles.submitButtonText}>Submit Response</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 8,
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modeToggle: {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: 'transparent',
    borderRadius: 8,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 6,
    borderWidth: 1,
    marginHorizontal: 2,
  },
  modeButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  voiceContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  microphoneButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  microphoneTouch: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceInstruction: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  voiceTextContainer: {
    padding: 16,
    borderRadius: 8,
    width: '100%',
  },
  voiceText: {
    fontSize: 16,
    lineHeight: 24,
  },
  textContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
  },
  quickResponsesContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  quickResponsesTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  quickResponsesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickResponseButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  quickResponseText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default VoiceResponseModal;
