/**
 * 🔄 Toggle with Undo Component
 * Toggle control with built-in undo/redo functionality
 * 
 * @author SAMS Development Team
 * @version 2.0.0
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  Animated
} from 'react-native';
import ToggleStateManager from '../services/toggleStateManager';

const ToggleWithUndo = ({ 
  serverId, 
  toggleId, 
  label, 
  description, 
  theme, 
  onToggle,
  disabled = false,
  showUndoButton = true,
  undoTimeout = 5000 // 5 seconds to show undo
}) => {
  const [toggleState, setToggleState] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [showUndo, setShowUndo] = useState(false);
  const [loading, setLoading] = useState(false);

  const undoOpacity = new Animated.Value(0);

  useEffect(() => {
    loadToggleState();
    checkUndoAvailability();
  }, [serverId, toggleId]);

  const loadToggleState = () => {
    const currentState = ToggleStateManager.getToggleState(serverId, toggleId);
    setToggleState(currentState);
  };

  const checkUndoAvailability = () => {
    const undoAvailable = ToggleStateManager.canUndoToggle(serverId, toggleId);
    setCanUndo(undoAvailable);
  };

  const handleToggleChange = async (newValue) => {
    if (disabled || loading) return;

    setLoading(true);

    try {
      // Call external toggle handler if provided
      if (onToggle) {
        const result = await onToggle(newValue);
        if (!result.success) {
          throw new Error(result.error || 'Toggle operation failed');
        }
      }

      // Update toggle state with undo capability
      const result = await ToggleStateManager.setToggleState(
        serverId, 
        toggleId, 
        newValue,
        {
          description: `${label} ${newValue ? 'enabled' : 'disabled'}`,
          canUndo: true
        }
      );

      if (result.success) {
        setToggleState(newValue);
        setCanUndo(true);
        
        // Show undo option temporarily
        if (showUndoButton && undoTimeout > 0) {
          showUndoOption();
        }
      }

    } catch (error) {
      console.error(`❌ Toggle operation failed: ${error.message}`);
      Alert.alert('❌ Error', `Failed to toggle ${label}: ${error.message}`);
      
      // Revert toggle state on error
      setToggleState(!newValue);
    } finally {
      setLoading(false);
    }
  };

  const showUndoOption = () => {
    setShowUndo(true);
    
    Animated.timing(undoOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Auto-hide undo option after timeout
    setTimeout(() => {
      hideUndoOption();
    }, undoTimeout);
  };

  const hideUndoOption = () => {
    Animated.timing(undoOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowUndo(false);
    });
  };

  const handleUndo = async () => {
    if (!canUndo || loading) return;

    setLoading(true);

    try {
      const result = await ToggleStateManager.undoLastToggle(serverId, toggleId);
      
      if (result.success) {
        setToggleState(result.revertedTo);
        setCanUndo(false);
        hideUndoOption();
        
        // Call external toggle handler for undo if provided
        if (onToggle) {
          await onToggle(result.revertedTo, { isUndo: true });
        }

        Alert.alert(
          '↩️ Undone',
          `${label} has been reverted to ${result.revertedTo ? 'enabled' : 'disabled'}`,
          [{ text: 'OK' }]
        );
      }

    } catch (error) {
      console.error(`❌ Undo operation failed: ${error.message}`);
      Alert.alert('❌ Error', `Failed to undo ${label}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const showToggleHistory = () => {
    const history = ToggleStateManager.getToggleHistory(serverId, 10);
    const toggleHistory = history.filter(entry => 
      entry.toggleId === toggleId || entry.action === 'bulk-reset'
    );

    if (toggleHistory.length === 0) {
      Alert.alert('📋 Toggle History', 'No history available for this toggle.');
      return;
    }

    const historyText = toggleHistory
      .map(entry => {
        const time = new Date(entry.timestamp).toLocaleString();
        const action = entry.action === 'undo' ? 'Undone' : 
                     entry.action === 'bulk-reset' ? 'Reset' : 'Changed';
        const state = entry.newState !== undefined ? 
                     (entry.newState ? 'ON' : 'OFF') : 'RESET';
        return `${time}: ${action} to ${state}`;
      })
      .join('\n');

    Alert.alert('📋 Toggle History', historyText, [{ text: 'OK' }]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <View style={styles.toggleRow}>
        <View style={styles.toggleInfo}>
          <Text style={[styles.toggleLabel, { color: theme.text }]}>
            {label}
          </Text>
          {description && (
            <Text style={[styles.toggleDescription, { color: theme.textSecondary }]}>
              {description}
            </Text>
          )}
        </View>
        
        <View style={styles.toggleControls}>
          <Switch
            value={toggleState}
            onValueChange={handleToggleChange}
            disabled={disabled || loading}
            trackColor={{ false: '#767577', true: theme.primary }}
            thumbColor={toggleState ? '#FFFFFF' : '#F4F3F4'}
          />
          
          {/* History Button */}
          <TouchableOpacity
            style={[styles.historyButton, { backgroundColor: theme.background }]}
            onPress={showToggleHistory}
          >
            <Text style={[styles.historyButtonText, { color: theme.textSecondary }]}>
              📋
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Undo Option */}
      {showUndo && showUndoButton && (
        <Animated.View 
          style={[
            styles.undoContainer, 
            { 
              backgroundColor: theme.background,
              opacity: undoOpacity 
            }
          ]}
        >
          <Text style={[styles.undoText, { color: theme.textSecondary }]}>
            {label} {toggleState ? 'enabled' : 'disabled'}
          </Text>
          
          <TouchableOpacity
            style={[styles.undoButton, { backgroundColor: theme.primary }]}
            onPress={handleUndo}
            disabled={!canUndo || loading}
          >
            <Text style={styles.undoButtonText}>↩️ Undo</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Permanent Undo Button (if undo is available but temporary undo is hidden) */}
      {!showUndo && canUndo && showUndoButton && (
        <View style={styles.permanentUndoContainer}>
          <TouchableOpacity
            style={[styles.permanentUndoButton, { backgroundColor: theme.background }]}
            onPress={handleUndo}
            disabled={loading}
          >
            <Text style={[styles.permanentUndoText, { color: theme.primary }]}>
              ↩️ Undo last change
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    padding: 12,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  toggleDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  toggleControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  historyButtonText: {
    fontSize: 14,
  },
  undoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  undoText: {
    fontSize: 12,
    flex: 1,
  },
  undoButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  undoButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  permanentUndoContainer: {
    marginTop: 8,
  },
  permanentUndoButton: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  permanentUndoText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default ToggleWithUndo;
