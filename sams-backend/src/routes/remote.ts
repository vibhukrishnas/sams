import express from 'express';
import { RemoteActionsService } from '../services/RemoteActionsService';

const router = express.Router();
const remoteService = RemoteActionsService.getInstance();

/**
 * @route POST /api/remote/power/:deviceId
 * @desc Execute power management actions (restart, shutdown, sleep, hibernate)
 * @access Public (in demo, should be protected in production)
 */
router.post('/power/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { type, delay = 0, force = false, message } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Device ID is required'
      });
    }

    if (!type || !['restart', 'shutdown', 'sleep', 'hibernate'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Valid power action type is required (restart, shutdown, sleep, hibernate)'
      });
    }

    const result = await remoteService.executePowerAction(deviceId, {
      type,
      delay,
      force,
      message
    });

    res.json({
      success: result.success,
      message: result.message,
      data: result
    });
  } catch (error) {
    console.error('Error executing power action:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute power action',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/remote/process/:deviceId
 * @desc Execute process management actions (start, stop, restart, kill)
 * @access Public (in demo, should be protected in production)
 */
router.post('/process/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { type, processName, arguments: args } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Device ID is required'
      });
    }

    if (!type || !['start', 'stop', 'restart', 'kill'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Valid process action type is required (start, stop, restart, kill)'
      });
    }

    if (!processName) {
      return res.status(400).json({
        success: false,
        message: 'Process name is required'
      });
    }

    const result = await remoteService.executeProcessAction(deviceId, {
      type,
      processName,
      arguments: args
    });

    res.json({
      success: result.success,
      message: result.message,
      data: result
    });
  } catch (error) {
    console.error('Error executing process action:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute process action',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/remote/script/:deviceId
 * @desc Execute scripts remotely
 * @access Public (in demo, should be protected in production)
 */
router.post('/script/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { 
      type, 
      scriptPath, 
      scriptContent, 
      arguments: args, 
      workingDirectory, 
      timeout = 30000 
    } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Device ID is required'
      });
    }

    if (!type || !['powershell', 'batch', 'python', 'nodejs'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Valid script type is required (powershell, batch, python, nodejs)'
      });
    }

    if (!scriptPath && !scriptContent) {
      return res.status(400).json({
        success: false,
        message: 'Either scriptPath or scriptContent is required'
      });
    }

    const result = await remoteService.executeScript(deviceId, {
      type,
      scriptPath,
      scriptContent,
      arguments: args,
      workingDirectory,
      timeout
    });

    res.json({
      success: result.success,
      message: result.message,
      data: result
    });
  } catch (error) {
    console.error('Error executing script:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute script',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/remote/service/:deviceId
 * @desc Execute Windows service actions
 * @access Public (in demo, should be protected in production)
 */
router.post('/service/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { serviceName, action } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Device ID is required'
      });
    }

    if (!serviceName) {
      return res.status(400).json({
        success: false,
        message: 'Service name is required'
      });
    }

    if (!action || !['start', 'stop', 'restart', 'status'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Valid service action is required (start, stop, restart, status)'
      });
    }

    const result = await remoteService.executeServiceAction(deviceId, {
      serviceName,
      action
    });

    res.json({
      success: result.success,
      message: result.message,
      data: result
    });
  } catch (error) {
    console.error('Error executing service action:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute service action',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/remote/file/:deviceId
 * @desc Execute file transfer operations
 * @access Public (in demo, should be protected in production)
 */
router.post('/file/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { type, localPath, remotePath, overwrite = false } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Device ID is required'
      });
    }

    if (!type || !['upload', 'download'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Valid transfer type is required (upload, download)'
      });
    }

    if (!localPath || !remotePath) {
      return res.status(400).json({
        success: false,
        message: 'Both localPath and remotePath are required'
      });
    }

    const result = await remoteService.executeFileTransfer(deviceId, {
      type,
      localPath,
      remotePath,
      overwrite
    });

    res.json({
      success: result.success,
      message: result.message,
      data: result
    });
  } catch (error) {
    console.error('Error executing file transfer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute file transfer',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/remote/registry/:deviceId
 * @desc Execute registry operations
 * @access Public (in demo, should be protected in production)
 */
router.post('/registry/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { action, keyPath, valueName, value, valueType = 'string' } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Device ID is required'
      });
    }

    if (!action || !['read', 'write', 'delete'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Valid registry action is required (read, write, delete)'
      });
    }

    if (!keyPath) {
      return res.status(400).json({
        success: false,
        message: 'Registry key path is required'
      });
    }

    const result = await remoteService.executeRegistryAction(deviceId, {
      action,
      keyPath,
      valueName,
      value,
      valueType
    });

    res.json({
      success: result.success,
      message: result.message,
      data: result
    });
  } catch (error) {
    console.error('Error executing registry action:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute registry action',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/remote/history/:deviceId
 * @desc Get action history for a device
 * @access Public (in demo, should be protected in production)
 */
router.get('/history/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Device ID is required'
      });
    }

    const history = remoteService.getActionHistory(deviceId);

    res.json({
      success: true,
      data: {
        deviceId,
        history,
        count: history.length
      }
    });
  } catch (error) {
    console.error('Error getting action history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get action history',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/remote/history
 * @desc Get all action history
 * @access Public (in demo, should be protected in production)
 */
router.get('/history', async (req, res) => {
  try {
    const allHistory = remoteService.getAllActionHistory();

    res.json({
      success: true,
      data: allHistory
    });
  } catch (error) {
    console.error('Error getting all action history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get action history',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route DELETE /api/remote/history/:deviceId
 * @desc Clear action history for a device
 * @access Public (in demo, should be protected in production)
 */
router.delete('/history/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Device ID is required'
      });
    }

    remoteService.clearActionHistory(deviceId);

    res.json({
      success: true,
      message: `Action history cleared for device: ${deviceId}`
    });
  } catch (error) {
    console.error('Error clearing action history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear action history',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
