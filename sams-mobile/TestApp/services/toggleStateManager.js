/**
 * 🔄 Toggle State Management Service
 * Manages toggle states with undo/redo functionality
 * 
 * @author SAMS Development Team
 * @version 2.0.0
 */

import { Alert } from 'react-native';
import { storeData, getData } from '../utils/storage';

class ToggleStateManager {
  constructor() {
    this.toggleStates = new Map(); // Current toggle states
    this.toggleHistory = []; // History of toggle changes
    this.undoStack = []; // Undo operations stack
    this.version = '2.0.0';
    
    console.log(`🔄 ToggleStateManager v${this.version} initialized`);
  }

  /**
   * 🔄 Set toggle state with undo capability
   */
  async setToggleState(serverId, toggleId, newState, options = {}) {
    try {
      const previousState = this.getToggleState(serverId, toggleId);
      
      // Create undo operation
      const undoOperation = {
        id: `undo-${Date.now()}`,
        serverId: serverId,
        toggleId: toggleId,
        previousState: previousState,
        newState: newState,
        timestamp: new Date(),
        description: options.description || `Toggle ${toggleId}`,
        canUndo: options.canUndo !== false // Default to true
      };

      // Update toggle state
      this.updateToggleState(serverId, toggleId, newState);
      
      // Add to undo stack if undoable
      if (undoOperation.canUndo) {
        this.undoStack.push(undoOperation);
        
        // Limit undo stack size
        if (this.undoStack.length > 50) {
          this.undoStack.shift();
        }
      }

      // Add to history
      this.toggleHistory.push({
        ...undoOperation,
        action: 'set'
      });

      // Save state
      await this.saveToggleState();

      console.log(`🔄 Toggle ${toggleId} set to ${newState} for server ${serverId}`);
      
      return {
        success: true,
        canUndo: undoOperation.canUndo,
        undoId: undoOperation.id
      };

    } catch (error) {
      console.error(`❌ Failed to set toggle state: ${error.message}`);
      throw error;
    }
  }

  /**
   * ↩️ Undo last toggle operation
   */
  async undoLastToggle(serverId, toggleId) {
    try {
      // Find the last undoable operation for this toggle
      const lastOperation = this.undoStack
        .slice()
        .reverse()
        .find(op => op.serverId === serverId && op.toggleId === toggleId);

      if (!lastOperation) {
        throw new Error('No undoable operations found for this toggle');
      }

      // Revert to previous state
      this.updateToggleState(serverId, toggleId, lastOperation.previousState);

      // Remove from undo stack
      const index = this.undoStack.indexOf(lastOperation);
      if (index > -1) {
        this.undoStack.splice(index, 1);
      }

      // Add undo action to history
      this.toggleHistory.push({
        id: `undo-${Date.now()}`,
        serverId: serverId,
        toggleId: toggleId,
        previousState: lastOperation.newState,
        newState: lastOperation.previousState,
        timestamp: new Date(),
        action: 'undo',
        originalOperation: lastOperation.id
      });

      // Save state
      await this.saveToggleState();

      console.log(`↩️ Undid toggle ${toggleId} for server ${serverId}`);
      
      return {
        success: true,
        revertedTo: lastOperation.previousState,
        originalOperation: lastOperation
      };

    } catch (error) {
      console.error(`❌ Failed to undo toggle: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🔄 Update toggle state in memory
   */
  updateToggleState(serverId, toggleId, state) {
    const serverToggles = this.toggleStates.get(serverId) || {};
    serverToggles[toggleId] = {
      state: state,
      lastUpdated: new Date(),
      updateCount: (serverToggles[toggleId]?.updateCount || 0) + 1
    };
    this.toggleStates.set(serverId, serverToggles);
  }

  /**
   * 📖 Get current toggle state
   */
  getToggleState(serverId, toggleId) {
    const serverToggles = this.toggleStates.get(serverId);
    if (!serverToggles || !serverToggles[toggleId]) {
      return false; // Default state
    }
    return serverToggles[toggleId].state;
  }

  /**
   * 📋 Get all toggle states for a server
   */
  getServerToggleStates(serverId) {
    const serverToggles = this.toggleStates.get(serverId) || {};
    const states = {};
    
    Object.keys(serverToggles).forEach(toggleId => {
      states[toggleId] = serverToggles[toggleId].state;
    });
    
    return states;
  }

  /**
   * 🔍 Check if toggle can be undone
   */
  canUndoToggle(serverId, toggleId) {
    return this.undoStack.some(op => 
      op.serverId === serverId && 
      op.toggleId === toggleId && 
      op.canUndo
    );
  }

  /**
   * 📊 Get undo operations for server
   */
  getUndoOperations(serverId) {
    return this.undoStack
      .filter(op => op.serverId === serverId)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 🗂️ Get toggle history for server
   */
  getToggleHistory(serverId, limit = 20) {
    return this.toggleHistory
      .filter(entry => entry.serverId === serverId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * 🔄 Reset all toggles for server
   */
  async resetServerToggles(serverId, options = {}) {
    try {
      const currentStates = this.getServerToggleStates(serverId);
      
      if (Object.keys(currentStates).length === 0) {
        throw new Error('No toggles to reset');
      }

      // Create bulk undo operation
      const resetOperation = {
        id: `reset-${Date.now()}`,
        serverId: serverId,
        action: 'bulk-reset',
        previousStates: currentStates,
        timestamp: new Date(),
        description: options.description || 'Reset all toggles',
        canUndo: options.canUndo !== false
      };

      // Reset all toggles to false
      Object.keys(currentStates).forEach(toggleId => {
        this.updateToggleState(serverId, toggleId, false);
      });

      // Add to undo stack if undoable
      if (resetOperation.canUndo) {
        this.undoStack.push(resetOperation);
      }

      // Add to history
      this.toggleHistory.push(resetOperation);

      // Save state
      await this.saveToggleState();

      console.log(`🔄 Reset all toggles for server ${serverId}`);
      
      return {
        success: true,
        resetCount: Object.keys(currentStates).length,
        canUndo: resetOperation.canUndo
      };

    } catch (error) {
      console.error(`❌ Failed to reset toggles: ${error.message}`);
      throw error;
    }
  }

  /**
   * ↩️ Undo bulk reset operation
   */
  async undoBulkReset(serverId) {
    try {
      // Find the last bulk reset operation
      const lastReset = this.undoStack
        .slice()
        .reverse()
        .find(op => op.serverId === serverId && op.action === 'bulk-reset');

      if (!lastReset) {
        throw new Error('No bulk reset operation found to undo');
      }

      // Restore previous states
      Object.keys(lastReset.previousStates).forEach(toggleId => {
        this.updateToggleState(serverId, toggleId, lastReset.previousStates[toggleId]);
      });

      // Remove from undo stack
      const index = this.undoStack.indexOf(lastReset);
      if (index > -1) {
        this.undoStack.splice(index, 1);
      }

      // Add undo action to history
      this.toggleHistory.push({
        id: `undo-reset-${Date.now()}`,
        serverId: serverId,
        action: 'undo-bulk-reset',
        restoredStates: lastReset.previousStates,
        timestamp: new Date(),
        originalOperation: lastReset.id
      });

      // Save state
      await this.saveToggleState();

      console.log(`↩️ Undid bulk reset for server ${serverId}`);
      
      return {
        success: true,
        restoredCount: Object.keys(lastReset.previousStates).length,
        restoredStates: lastReset.previousStates
      };

    } catch (error) {
      console.error(`❌ Failed to undo bulk reset: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🧹 Clear undo history
   */
  clearUndoHistory(serverId = null) {
    if (serverId) {
      // Clear history for specific server
      this.undoStack = this.undoStack.filter(op => op.serverId !== serverId);
      this.toggleHistory = this.toggleHistory.filter(entry => entry.serverId !== serverId);
    } else {
      // Clear all history
      this.undoStack = [];
      this.toggleHistory = [];
    }
    
    console.log(`🧹 Cleared undo history${serverId ? ` for server ${serverId}` : ''}`);
  }

  /**
   * 💾 Save toggle state to storage
   */
  async saveToggleState() {
    try {
      const stateData = {
        toggleStates: Object.fromEntries(this.toggleStates),
        undoStack: this.undoStack.slice(-50), // Keep last 50 undo operations
        history: this.toggleHistory.slice(-200), // Keep last 200 history entries
        lastSaved: new Date().toISOString()
      };

      await storeData('toggle_state', stateData);
      console.log('✅ Toggle state saved to storage');
    } catch (error) {
      console.error('❌ Failed to save toggle state:', error);
    }
  }

  /**
   * 📖 Load toggle state from storage
   */
  async loadToggleState() {
    try {
      const stateData = await getData('toggle_state');
      
      if (stateData) {
        this.toggleStates = new Map(Object.entries(stateData.toggleStates || {}));
        this.undoStack = stateData.undoStack || [];
        this.toggleHistory = stateData.history || [];
        
        console.log(`✅ Toggle state loaded: ${this.toggleStates.size} servers`);
      }
    } catch (error) {
      console.error('❌ Failed to load toggle state:', error);
    }
  }

  /**
   * 📊 Get toggle statistics
   */
  getToggleStatistics() {
    const stats = {
      totalServers: this.toggleStates.size,
      totalToggles: 0,
      activeToggles: 0,
      undoOperations: this.undoStack.length,
      historyEntries: this.toggleHistory.length
    };

    this.toggleStates.forEach(serverToggles => {
      Object.values(serverToggles).forEach(toggle => {
        stats.totalToggles++;
        if (toggle.state) {
          stats.activeToggles++;
        }
      });
    });

    return stats;
  }
}

// Export singleton instance
export default new ToggleStateManager();
