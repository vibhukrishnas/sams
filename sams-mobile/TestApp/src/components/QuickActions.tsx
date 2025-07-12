/**
 * ⚡ Quick Actions Component
 * Provides swipe actions, voice commands, and rapid response features
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanGestureHandler,
  State,
  Alert,
  Vibration,
  Linking,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Voice from '@react-native-voice/voice';

interface QuickActionsProps {
  item: any;
  type: 'alert' | 'server' | 'command';
  onAction: (action: string, data?: any) => void;
  children: React.ReactNode;
}

interface VoiceCommand {
  command: string;
  action: string;
  confidence: number;
}

const QuickActions: React.FC<QuickActionsProps> = ({
  item,
  type,
  onAction,
  children,
}) => {
  const [translateX] = useState(new Animated.Value(0));
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceResults, setVoiceResults] = useState<string[]>([]);
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    initializeVoice();
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const initializeVoice = async () => {
    try {
      Voice.onSpeechStart = onSpeechStart;
      Voice.onSpeechEnd = onSpeechEnd;
      Voice.onSpeechResults = onSpeechResults;
      Voice.onSpeechError = onSpeechError;
    } catch (error) {
      console.error('Voice initialization error:', error);
    }
  };

  const onSpeechStart = () => {
    setIsVoiceActive(true);
  };

  const onSpeechEnd = () => {
    setIsVoiceActive(false);
  };

  const onSpeechResults = (event: any) => {
    setVoiceResults(event.value);
    processVoiceCommand(event.value[0]);
  };

  const onSpeechError = (event: any) => {
    console.error('Voice error:', event.error);
    setIsVoiceActive(false);
  };

  const startVoiceRecognition = async () => {
    try {
      await Voice.start('en-US');
      Vibration.vibrate(50);
    } catch (error) {
      console.error('Voice start error:', error);
    }
  };

  const processVoiceCommand = (command: string) => {
    const lowerCommand = command.toLowerCase();
    
    // Voice command patterns
    const commands = [
      { pattern: /acknowledge|ack/, action: 'acknowledge' },
      { pattern: /escalate|urgent/, action: 'escalate' },
      { pattern: /resolve|fix/, action: 'resolve' },
      { pattern: /details|info/, action: 'details' },
      { pattern: /call|contact/, action: 'emergency_contact' },
      { pattern: /status|health/, action: 'health_check' },
    ];

    for (const cmd of commands) {
      if (cmd.pattern.test(lowerCommand)) {
        executeVoiceAction(cmd.action);
        break;
      }
    }
  };

  const executeVoiceAction = (action: string) => {
    Vibration.vibrate(100);
    onAction(action, { source: 'voice', item });
  };

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX } = event.nativeEvent;
      
      if (translationX > 100) {
        // Swipe right - Primary action
        handleSwipeAction('primary');
      } else if (translationX < -100) {
        // Swipe left - Secondary action
        handleSwipeAction('secondary');
      } else {
        // Reset position
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    }
  };

  const handleSwipeAction = (direction: 'primary' | 'secondary') => {
    const actions = getSwipeActions();
    const action = direction === 'primary' ? actions.primary : actions.secondary;
    
    if (action) {
      Vibration.vibrate(50);
      onAction(action.type, { item, source: 'swipe' });
    }

    // Reset position
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  };

  const getSwipeActions = () => {
    switch (type) {
      case 'alert':
        return {
          primary: item.acknowledged 
            ? { type: 'resolve', icon: 'check-circle', color: '#00FF88' }
            : { type: 'acknowledge', icon: 'check', color: '#00FF88' },
          secondary: { type: 'escalate', icon: 'trending-up', color: '#FF6B35' },
        };
      case 'server':
        return {
          primary: { type: 'health_check', icon: 'health-and-safety', color: '#00BFFF' },
          secondary: { type: 'restart', icon: 'refresh', color: '#FFA500' },
        };
      case 'command':
        return {
          primary: { type: 'execute', icon: 'play-arrow', color: '#00FF88' },
          secondary: { type: 'edit', icon: 'edit', color: '#00BFFF' },
        };
      default:
        return { primary: null, secondary: null };
    }
  };

  const getQuickActionButtons = () => {
    switch (type) {
      case 'alert':
        return [
          { 
            icon: 'check', 
            label: 'Acknowledge', 
            action: 'acknowledge',
            color: '#00FF88',
            disabled: item.acknowledged 
          },
          { 
            icon: 'trending-up', 
            label: 'Escalate', 
            action: 'escalate',
            color: '#FF6B35' 
          },
          { 
            icon: 'info', 
            label: 'Details', 
            action: 'details',
            color: '#00BFFF' 
          },
          { 
            icon: 'phone', 
            label: 'Emergency', 
            action: 'emergency_contact',
            color: '#FF3366' 
          },
        ];
      case 'server':
        return [
          { 
            icon: 'health-and-safety', 
            label: 'Health Check', 
            action: 'health_check',
            color: '#00BFFF' 
          },
          { 
            icon: 'refresh', 
            label: 'Restart', 
            action: 'restart',
            color: '#FFA500' 
          },
          { 
            icon: 'terminal', 
            label: 'Console', 
            action: 'console',
            color: '#9C27B0' 
          },
        ];
      default:
        return [];
    }
  };

  const handleEmergencyContact = () => {
    Alert.alert(
      'Emergency Contact',
      'Choose emergency contact method:',
      [
        { text: 'Call On-Call Engineer', onPress: () => Linking.openURL('tel:+1234567890') },
        { text: 'SMS Operations Team', onPress: () => Linking.openURL('sms:+1234567890') },
        { text: 'Slack Emergency Channel', onPress: () => onAction('slack_emergency', { item }) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleQuickAction = (action: string) => {
    if (action === 'emergency_contact') {
      handleEmergencyContact();
    } else {
      onAction(action, { item, source: 'button' });
    }
  };

  const renderSwipeIndicators = () => {
    const actions = getSwipeActions();
    
    return (
      <>
        {/* Left swipe indicator */}
        {actions.primary && (
          <Animated.View
            style={[
              styles.swipeIndicator,
              styles.leftIndicator,
              {
                opacity: translateX.interpolate({
                  inputRange: [0, 100],
                  outputRange: [0, 1],
                  extrapolate: 'clamp',
                }),
              },
            ]}
          >
            <Icon name={actions.primary.icon} size={24} color={actions.primary.color} />
            <Text style={[styles.swipeText, { color: actions.primary.color }]}>
              {actions.primary.type.toUpperCase()}
            </Text>
          </Animated.View>
        )}

        {/* Right swipe indicator */}
        {actions.secondary && (
          <Animated.View
            style={[
              styles.swipeIndicator,
              styles.rightIndicator,
              {
                opacity: translateX.interpolate({
                  inputRange: [-100, 0],
                  outputRange: [1, 0],
                  extrapolate: 'clamp',
                }),
              },
            ]}
          >
            <Icon name={actions.secondary.icon} size={24} color={actions.secondary.color} />
            <Text style={[styles.swipeText, { color: actions.secondary.color }]}>
              {actions.secondary.type.toUpperCase()}
            </Text>
          </Animated.View>
        )}
      </>
    );
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.itemContainer}>
        {renderSwipeIndicators()}
        
        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
        >
          <Animated.View
            style={[
              styles.content,
              { transform: [{ translateX }] },
            ]}
          >
            {children}
          </Animated.View>
        </PanGestureHandler>

        {/* Quick Action Buttons */}
        <View style={styles.quickActions}>
          {getQuickActionButtons().map((button, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.quickActionButton,
                { borderColor: button.color },
                button.disabled && styles.disabledButton,
              ]}
              onPress={() => handleQuickAction(button.action)}
              disabled={button.disabled}
            >
              <Icon name={button.icon} size={16} color={button.disabled ? '#666' : button.color} />
              <Text style={[
                styles.quickActionText,
                { color: button.disabled ? '#666' : button.color }
              ]}>
                {button.label}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Voice Command Button */}
          <TouchableOpacity
            style={[
              styles.voiceButton,
              isVoiceActive && styles.voiceButtonActive,
            ]}
            onPress={startVoiceRecognition}
            onLongPress={startVoiceRecognition}
          >
            <Icon 
              name={isVoiceActive ? 'mic' : 'mic-none'} 
              size={20} 
              color={isVoiceActive ? '#FF3366' : '#00FF88'} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  itemContainer: {
    position: 'relative',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  content: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
  },
  swipeIndicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  leftIndicator: {
    left: 0,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
  },
  rightIndicator: {
    right: 0,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
  },
  swipeText: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 4,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0A0A0A',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 2,
  },
  disabledButton: {
    opacity: 0.5,
  },
  quickActionText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  voiceButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00FF88',
  },
  voiceButtonActive: {
    backgroundColor: '#2A0A0A',
    borderColor: '#FF3366',
  },
});

export default QuickActions;
