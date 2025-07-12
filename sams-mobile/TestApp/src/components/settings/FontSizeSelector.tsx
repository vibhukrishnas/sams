import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../theme/ThemeProvider';
import AccessibilityService from '../../services/AccessibilityService';
import HapticService from '../../services/HapticService';

interface FontSizeSelectorProps {
  visible: boolean;
  currentSize: 'small' | 'normal' | 'large' | 'extraLarge';
  onSelect: (size: 'small' | 'normal' | 'large' | 'extraLarge') => void;
  onClose: () => void;
}

const FontSizeSelector: React.FC<FontSizeSelectorProps> = ({
  visible,
  currentSize,
  onSelect,
  onClose,
}) => {
  const { theme } = useTheme();

  const fontSizeOptions = [
    {
      id: 'small',
      name: 'Small',
      description: 'Compact text for more content',
      scale: 0.85,
      icon: 'text-decrease',
    },
    {
      id: 'normal',
      name: 'Normal',
      description: 'Standard text size',
      scale: 1.0,
      icon: 'text-fields',
    },
    {
      id: 'large',
      name: 'Large',
      description: 'Larger text for better readability',
      scale: 1.15,
      icon: 'text-increase',
    },
    {
      id: 'extraLarge',
      name: 'Extra Large',
      description: 'Maximum text size for accessibility',
      scale: 1.3,
      icon: 'format-size',
    },
  ];

  const handleSelect = (sizeId: 'small' | 'normal' | 'large' | 'extraLarge') => {
    HapticService.buttonPress();
    onSelect(sizeId);
    
    // Announce change for screen readers
    AccessibilityService.announceForAccessibility(`Font size changed to ${sizeId}`);
    
    onClose();
  };

  const renderFontSizeOption = (option: typeof fontSizeOptions[0]) => {
    const isSelected = currentSize === option.id;
    const scaledFontSize = AccessibilityService.getScaledFontSize(16);
    
    return (
      <TouchableOpacity
        key={option.id}
        style={[
          styles.fontOption,
          { backgroundColor: theme.colors.surface },
          isSelected && { borderColor: theme.colors.primary, borderWidth: 2 },
        ]}
        onPress={() => handleSelect(option.id as any)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${option.name} font size`}
        accessibilityHint={option.description}
        accessibilityState={{ selected: isSelected }}
      >
        <View style={styles.fontHeader}>
          <View style={styles.fontInfo}>
            <Icon
              name={option.icon}
              size={24}
              color={isSelected ? theme.colors.primary : theme.colors.text}
            />
            <View style={styles.fontText}>
              <Text style={[
                styles.fontName,
                { color: theme.colors.text },
                isSelected && { color: theme.colors.primary, fontWeight: 'bold' }
              ]}>
                {option.name}
              </Text>
              <Text style={[styles.fontDescription, { color: theme.colors.textSecondary }]}>
                {option.description}
              </Text>
            </View>
          </View>
          
          {isSelected && (
            <Icon name="check-circle" size={20} color={theme.colors.primary} />
          )}
        </View>
        
        {/* Font Preview */}
        <View style={[styles.fontPreview, { backgroundColor: theme.colors.background }]}>
          <Text style={[
            styles.previewTitle,
            { 
              color: theme.colors.text,
              fontSize: 18 * option.scale,
            }
          ]}>
            Critical Alert
          </Text>
          <Text style={[
            styles.previewSubtitle,
            { 
              color: theme.colors.textSecondary,
              fontSize: 14 * option.scale,
            }
          ]}>
            High CPU usage detected on Web Server 1
          </Text>
          <Text style={[
            styles.previewBody,
            { 
              color: theme.colors.text,
              fontSize: 12 * option.scale,
            }
          ]}>
            CPU usage has exceeded 90% threshold for the past 5 minutes.
          </Text>
        </View>
        
        {/* Scale Indicator */}
        <View style={styles.scaleIndicator}>
          <Text style={[styles.scaleText, { color: theme.colors.textSecondary }]}>
            Scale: {Math.round(option.scale * 100)}%
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.header, { borderBottomColor: theme.colors.divider }]}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Font Size
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                HapticService.buttonPress();
                onClose();
              }}
            >
              <Icon name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {fontSizeOptions.map(renderFontSizeOption)}
            
            <View style={styles.note}>
              <Icon name="accessibility" size={16} color={theme.colors.textSecondary} />
              <Text style={[styles.noteText, { color: theme.colors.textSecondary }]}>
                Font size affects all text throughout the app. Larger sizes improve readability for users with visual impairments.
              </Text>
            </View>
            
            <View style={styles.systemNote}>
              <Icon name="info" size={16} color={theme.colors.textSecondary} />
              <Text style={[styles.noteText, { color: theme.colors.textSecondary }]}>
                This setting works in addition to your device's system font size setting.
              </Text>
            </View>
          </ScrollView>
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  fontOption: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  fontHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  fontInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fontText: {
    marginLeft: 12,
    flex: 1,
  },
  fontName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  fontDescription: {
    fontSize: 14,
  },
  fontPreview: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  previewTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  previewSubtitle: {
    fontWeight: '500',
    marginBottom: 4,
  },
  previewBody: {
    lineHeight: 18,
  },
  scaleIndicator: {
    alignItems: 'center',
  },
  scaleText: {
    fontSize: 12,
    fontWeight: '500',
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  systemNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  noteText: {
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
});

export default FontSizeSelector;
