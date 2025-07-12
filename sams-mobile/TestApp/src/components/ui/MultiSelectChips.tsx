import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface Option {
  id: string;
  label: string;
  color: string;
}

interface MultiSelectChipsProps {
  options: Option[];
  selectedIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  maxSelections?: number;
  style?: any;
}

const MultiSelectChips: React.FC<MultiSelectChipsProps> = ({
  options,
  selectedIds,
  onSelectionChange,
  maxSelections,
  style,
}) => {
  const handleToggleSelection = (id: string) => {
    const isSelected = selectedIds.includes(id);
    let newSelection: string[];

    if (isSelected) {
      // Remove from selection
      newSelection = selectedIds.filter(selectedId => selectedId !== id);
    } else {
      // Add to selection
      if (maxSelections && selectedIds.length >= maxSelections) {
        // Replace the first selected item if max reached
        newSelection = [...selectedIds.slice(1), id];
      } else {
        newSelection = [...selectedIds, id];
      }
    }

    onSelectionChange(newSelection);
  };

  const renderChip = (option: Option) => {
    const isSelected = selectedIds.includes(option.id);
    
    return (
      <TouchableOpacity
        key={option.id}
        style={[
          styles.chip,
          isSelected && styles.chipSelected,
          isSelected && { backgroundColor: option.color },
        ]}
        onPress={() => handleToggleSelection(option.id)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.chipText,
            isSelected && styles.chipTextSelected,
          ]}
        >
          {option.label}
        </Text>
        
        {isSelected && (
          <Icon
            name="check"
            size={16}
            color="#fff"
            style={styles.checkIcon}
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.chipsContainer}>
          {options.map(renderChip)}
        </View>
      </ScrollView>
      
      {maxSelections && (
        <Text style={styles.limitText}>
          {selectedIds.length}/{maxSelections} selected
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  scrollContent: {
    paddingHorizontal: 4,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  chipSelected: {
    borderColor: 'transparent',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  checkIcon: {
    marginLeft: 4,
  },
  limitText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
});

export default MultiSelectChips;
