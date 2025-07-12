import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getTheme } from '../../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSnooze: (duration: number, customTime?: Date) => void;
  alertId: string;
  alertTitle: string;
  isDark: boolean;
}

const AlertSnoozeModal: React.FC<Props> = ({
  visible,
  onClose,
  onSnooze,
  alertId,
  alertTitle,
  isDark,
}) => {
  const theme = getTheme(isDark);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customDate, setCustomDate] = useState(new Date());

  const snoozeDurations = [
    { label: '15 minutes', value: 15, icon: 'schedule' },
    { label: '30 minutes', value: 30, icon: 'schedule' },
    { label: '1 hour', value: 60, icon: 'schedule' },
    { label: '2 hours', value: 120, icon: 'schedule' },
    { label: '4 hours', value: 240, icon: 'schedule' },
    { label: '8 hours', value: 480, icon: 'bedtime' },
    { label: '1 day', value: 1440, icon: 'today' },
    { label: '3 days', value: 4320, icon: 'event' },
    { label: '1 week', value: 10080, icon: 'date-range' },
  ];

  const handleSnooze = () => {
    if (selectedDuration !== null) {
      if (selectedDuration === -1) {
        // Custom time selected
        const now = new Date();
        const diffInMinutes = Math.floor((customDate.getTime() - now.getTime()) / (1000 * 60));
        
        if (diffInMinutes <= 0) {
          Alert.alert('Invalid Time', 'Please select a future time.');
          return;
        }
        
        onSnooze(diffInMinutes, customDate);
      } else {
        onSnooze(selectedDuration);
      }
      onClose();
    } else {
      Alert.alert('No Duration Selected', 'Please select a snooze duration.');
    }
  };

  const handleCustomTime = () => {
    setSelectedDuration(-1);
    setShowCustomPicker(true);
  };

  const formatCustomTime = () => {
    return customDate.toLocaleString();
  };

  const getSnoozeDescription = () => {
    if (selectedDuration === null) return '';
    if (selectedDuration === -1) {
      return `Until ${formatCustomTime()}`;
    }
    
    const duration = snoozeDurations.find(d => d.value === selectedDuration);
    return duration ? `For ${duration.label}` : '';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Icon name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Snooze Alert
          </Text>
          <View style={styles.headerButton} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Alert Info */}
          <View style={[styles.alertInfo, { backgroundColor: theme.colors.surface }]}>
            <Icon name="notifications-paused" size={24} color={theme.colors.primary} />
            <View style={styles.alertTextContainer}>
              <Text style={[styles.alertTitle, { color: theme.colors.text }]}>
                {alertTitle}
              </Text>
              <Text style={[styles.alertDescription, { color: theme.colors.textSecondary }]}>
                This alert will be temporarily hidden and will reappear after the selected time.
              </Text>
            </View>
          </View>

          {/* Duration Options */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Snooze Duration
            </Text>
            <View style={styles.durationGrid}>
              {snoozeDurations.map((duration) => (
                <TouchableOpacity
                  key={duration.value}
                  style={[
                    styles.durationOption,
                    {
                      backgroundColor: selectedDuration === duration.value
                        ? theme.colors.primary
                        : theme.colors.surface,
                      borderColor: selectedDuration === duration.value
                        ? theme.colors.primary
                        : theme.colors.border,
                    },
                  ]}
                  onPress={() => setSelectedDuration(duration.value)}
                >
                  <Icon
                    name={duration.icon}
                    size={24}
                    color={selectedDuration === duration.value ? '#FFFFFF' : theme.colors.text}
                  />
                  <Text
                    style={[
                      styles.durationText,
                      {
                        color: selectedDuration === duration.value ? '#FFFFFF' : theme.colors.text,
                      },
                    ]}
                  >
                    {duration.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Custom Time Option */}
          <View style={styles.section}>
            <TouchableOpacity
              style={[
                styles.customTimeOption,
                {
                  backgroundColor: selectedDuration === -1
                    ? theme.colors.primary
                    : theme.colors.surface,
                  borderColor: selectedDuration === -1
                    ? theme.colors.primary
                    : theme.colors.border,
                },
              ]}
              onPress={handleCustomTime}
            >
              <Icon
                name="access-time"
                size={24}
                color={selectedDuration === -1 ? '#FFFFFF' : theme.colors.text}
              />
              <View style={styles.customTimeTextContainer}>
                <Text
                  style={[
                    styles.customTimeTitle,
                    {
                      color: selectedDuration === -1 ? '#FFFFFF' : theme.colors.text,
                    },
                  ]}
                >
                  Custom Time
                </Text>
                {selectedDuration === -1 && (
                  <Text
                    style={[
                      styles.customTimeSubtitle,
                      { color: '#FFFFFF' },
                    ]}
                  >
                    {formatCustomTime()}
                  </Text>
                )}
              </View>
              <Icon
                name="chevron-right"
                size={24}
                color={selectedDuration === -1 ? '#FFFFFF' : theme.colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Selected Duration Summary */}
          {selectedDuration !== null && (
            <View style={[styles.summaryContainer, { backgroundColor: theme.colors.surface }]}>
              <Icon name="info" size={20} color={theme.colors.primary} />
              <Text style={[styles.summaryText, { color: theme.colors.text }]}>
                Alert will be snoozed {getSnoozeDescription().toLowerCase()}
              </Text>
            </View>
          )}

          {/* Warning */}
          <View style={[styles.warningContainer, { backgroundColor: '#FFF3E0' }]}>
            <Icon name="warning" size={20} color="#FF9800" />
            <Text style={[styles.warningText, { color: '#E65100' }]}>
              Snoozing an alert may delay critical issue resolution. Use responsibly.
            </Text>
          </View>
        </ScrollView>

        {/* Custom Date Picker */}
        {showCustomPicker && (
          <View style={[styles.pickerContainer, { backgroundColor: theme.colors.surface }]}>
            <DateTimePicker
              value={customDate}
              mode="datetime"
              display="default"
              onChange={(event, selectedDate) => {
                if (selectedDate) {
                  setCustomDate(selectedDate);
                }
                setShowCustomPicker(false);
              }}
              minimumDate={new Date()}
            />
          </View>
        )}

        {/* Action Buttons */}
        <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: theme.colors.border }]}
            onPress={onClose}
          >
            <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.snoozeButton,
              {
                backgroundColor: theme.colors.primary,
                opacity: selectedDuration !== null ? 1 : 0.5,
              },
            ]}
            onPress={handleSnooze}
            disabled={selectedDuration === null}
          >
            <Icon name="snooze" size={20} color="#FFFFFF" />
            <Text style={styles.snoozeButtonText}>Snooze Alert</Text>
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  alertInfo: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 8,
    marginVertical: 16,
  },
  alertTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  alertDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  durationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: '45%',
  },
  durationText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  customTimeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  customTimeTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  customTimeTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  customTimeSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  summaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  summaryText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  warningText: {
    marginLeft: 8,
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  pickerContainer: {
    padding: 16,
    borderTopWidth: 1,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  snoozeButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
  },
  snoozeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default AlertSnoozeModal;
