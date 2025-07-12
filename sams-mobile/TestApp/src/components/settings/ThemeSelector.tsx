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
import HapticService from '../../services/HapticService';

interface ThemeSelectorProps {
  visible: boolean;
  currentTheme: 'light' | 'dark' | 'system';
  onSelect: (theme: 'light' | 'dark' | 'system') => void;
  onClose: () => void;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  visible,
  currentTheme,
  onSelect,
  onClose,
}) => {
  const { theme } = useTheme();

  const themeOptions = [
    {
      id: 'light',
      name: 'Light',
      description: 'Light theme with bright colors',
      icon: 'light-mode',
      preview: {
        background: '#FFFFFF',
        surface: '#F8F9FA',
        text: '#212121',
        primary: '#1976D2',
      },
    },
    {
      id: 'dark',
      name: 'Dark',
      description: 'Dark theme for low-light environments',
      icon: 'dark-mode',
      preview: {
        background: '#121212',
        surface: '#1E1E1E',
        text: '#FFFFFF',
        primary: '#90CAF9',
      },
    },
    {
      id: 'system',
      name: 'System',
      description: 'Follow system theme setting',
      icon: 'settings-brightness',
      preview: {
        background: 'linear-gradient(45deg, #FFFFFF 50%, #121212 50%)',
        surface: 'linear-gradient(45deg, #F8F9FA 50%, #1E1E1E 50%)',
        text: 'linear-gradient(45deg, #212121 50%, #FFFFFF 50%)',
        primary: '#1976D2',
      },
    },
  ];

  const handleSelect = (themeId: 'light' | 'dark' | 'system') => {
    HapticService.buttonPress();
    onSelect(themeId);
    onClose();
  };

  const renderThemeOption = (option: typeof themeOptions[0]) => {
    const isSelected = currentTheme === option.id;
    
    return (
      <TouchableOpacity
        key={option.id}
        style={[
          styles.themeOption,
          { backgroundColor: theme.colors.surface },
          isSelected && { borderColor: theme.colors.primary, borderWidth: 2 },
        ]}
        onPress={() => handleSelect(option.id as any)}
        activeOpacity={0.7}
      >
        <View style={styles.themeHeader}>
          <View style={styles.themeInfo}>
            <Icon
              name={option.icon}
              size={24}
              color={isSelected ? theme.colors.primary : theme.colors.text}
            />
            <View style={styles.themeText}>
              <Text style={[
                styles.themeName,
                { color: theme.colors.text },
                isSelected && { color: theme.colors.primary, fontWeight: 'bold' }
              ]}>
                {option.name}
              </Text>
              <Text style={[styles.themeDescription, { color: theme.colors.textSecondary }]}>
                {option.description}
              </Text>
            </View>
          </View>
          
          {isSelected && (
            <Icon name="check-circle" size={20} color={theme.colors.primary} />
          )}
        </View>
        
        {/* Theme Preview */}
        <View style={styles.themePreview}>
          {option.id === 'system' ? (
            <View style={styles.systemPreview}>
              <View style={[styles.previewHalf, { backgroundColor: '#FFFFFF' }]}>
                <View style={[styles.previewElement, { backgroundColor: '#F8F9FA' }]} />
                <View style={[styles.previewElement, { backgroundColor: '#1976D2' }]} />
              </View>
              <View style={[styles.previewHalf, { backgroundColor: '#121212' }]}>
                <View style={[styles.previewElement, { backgroundColor: '#1E1E1E' }]} />
                <View style={[styles.previewElement, { backgroundColor: '#90CAF9' }]} />
              </View>
            </View>
          ) : (
            <View style={[styles.normalPreview, { backgroundColor: option.preview.background }]}>
              <View style={[styles.previewElement, { backgroundColor: option.preview.surface }]} />
              <View style={[styles.previewElement, { backgroundColor: option.preview.primary }]} />
              <View style={[styles.previewElement, { backgroundColor: option.preview.text, opacity: 0.3 }]} />
            </View>
          )}
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
              Choose Theme
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
            {themeOptions.map(renderThemeOption)}
            
            <View style={styles.note}>
              <Icon name="info" size={16} color={theme.colors.textSecondary} />
              <Text style={[styles.noteText, { color: theme.colors.textSecondary }]}>
                System theme will automatically switch between light and dark based on your device settings.
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
    maxHeight: '70%',
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
  themeOption: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  themeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  themeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  themeText: {
    marginLeft: 12,
    flex: 1,
  },
  themeName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  themeDescription: {
    fontSize: 14,
  },
  themePreview: {
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
  },
  systemPreview: {
    flexDirection: 'row',
    height: '100%',
  },
  previewHalf: {
    flex: 1,
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  normalPreview: {
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: '100%',
  },
  previewElement: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  note: {
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

export default ThemeSelector;
