import express from 'express';
import { AssetInventoryService } from '../services/AssetInventoryService';

const router = express.Router();
const assetService = AssetInventoryService.getInstance();

/**
 * @route GET /api/assets/inventory/:deviceId
 * @desc Get asset inventory for a specific device
 * @access Public (in demo, should be protected in production)
 */
router.get('/inventory/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Device ID is required'
      });
    }

    // Check if we have cached inventory
    let inventory = assetService.getInventory(deviceId);
    
    if (!inventory) {
      // Perform new discovery
      inventory = await assetService.performAssetDiscovery(deviceId);
    }

    res.json({
      success: true,
      data: inventory
    });
  } catch (error) {
    console.error('Error getting asset inventory:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get asset inventory',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/assets/discover/:deviceId
 * @desc Trigger new asset discovery for a device
 * @access Public (in demo, should be protected in production)
 */
router.post('/discover/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Device ID is required'
      });
    }

    console.log(`Starting asset discovery for device: ${deviceId}`);
    
    // Perform asset discovery
    const inventory = await assetService.performAssetDiscovery(deviceId);

    res.json({
      success: true,
      message: 'Asset discovery completed successfully',
      data: inventory
    });
  } catch (error) {
    console.error('Error during asset discovery:', error);
    res.status(500).json({
      success: false,
      message: 'Asset discovery failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/assets/inventory
 * @desc Get all cached asset inventories
 * @access Public (in demo, should be protected in production)
 */
router.get('/inventory', async (req, res) => {
  try {
    const inventories = assetService.getAllInventories();
    
    res.json({
      success: true,
      data: inventories,
      count: inventories.length
    });
  } catch (error) {
    console.error('Error getting all inventories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get inventories',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/assets/changes/:deviceId
 * @desc Get change history for a device
 * @access Public (in demo, should be protected in production)
 */
router.get('/changes/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Device ID is required'
      });
    }

    const inventory = assetService.getInventory(deviceId);
    
    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Device inventory not found'
      });
    }

    res.json({
      success: true,
      data: {
        deviceId,
        hostname: inventory.hostname,
        lastScanned: inventory.lastScanned,
        changes: inventory.changes
      }
    });
  } catch (error) {
    console.error('Error getting change history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get change history',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/assets/summary/:deviceId
 * @desc Get summary of asset information for a device
 * @access Public (in demo, should be protected in production)
 */
router.get('/summary/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Device ID is required'
      });
    }

    const inventory = assetService.getInventory(deviceId);
    
    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Device inventory not found'
      });
    }

    // Create summary
    const summary = {
      deviceId,
      hostname: inventory.hostname,
      lastScanned: inventory.lastScanned,
      hardware: {
        cpu: inventory.hardware.cpu.name,
        memory: `${inventory.hardware.memory.totalGB}GB`,
        storage: inventory.hardware.storage.map(s => `${s.model} (${s.size}GB ${s.type})`),
        networkAdapters: inventory.hardware.network.length
      },
      software: {
        os: `${inventory.software.os.name} ${inventory.software.os.version}`,
        installedApps: inventory.software.installedApps.length,
        services: inventory.software.services.length,
        drivers: inventory.software.drivers.length
      },
      recentChanges: inventory.changes.slice(-5) // Last 5 changes
    };

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error getting asset summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get asset summary',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
