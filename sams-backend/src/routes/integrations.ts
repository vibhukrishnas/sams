import express from 'express';
import { IntegrationService } from '../services/IntegrationService';

const router = express.Router();
const integrationService = IntegrationService.getInstance();

/**
 * @route GET /api/integrations/webhooks
 * @desc Get all webhooks
 * @access Public (in demo, should be protected in production)
 */
router.get('/webhooks', async (req, res) => {
  try {
    const webhooks = integrationService.getWebhooks();

    res.json({
      success: true,
      data: webhooks,
      count: webhooks.length
    });
  } catch (error) {
    console.error('Error getting webhooks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get webhooks',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/integrations/webhooks
 * @desc Create a new webhook
 * @access Public (in demo, should be protected in production)
 */
router.post('/webhooks', async (req, res) => {
  try {
    const webhookData = req.body;

    // Validate required fields
    const requiredFields = ['name', 'url', 'method', 'events'];
    for (const field of requiredFields) {
      if (!webhookData[field]) {
        return res.status(400).json({
          success: false,
          message: `${field} is required`
        });
      }
    }

    // Set defaults
    const webhook = {
      headers: {},
      enabled: true,
      timeout: 5000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...webhookData
    };

    const createdWebhook = integrationService.createWebhook(webhook);

    res.status(201).json({
      success: true,
      message: 'Webhook created successfully',
      data: createdWebhook
    });
  } catch (error) {
    console.error('Error creating webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create webhook',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route PUT /api/integrations/webhooks/:webhookId
 * @desc Update a webhook
 * @access Public (in demo, should be protected in production)
 */
router.put('/webhooks/:webhookId', async (req, res) => {
  try {
    const { webhookId } = req.params;
    const updates = req.body;

    if (!webhookId) {
      return res.status(400).json({
        success: false,
        message: 'Webhook ID is required'
      });
    }

    const updatedWebhook = integrationService.updateWebhook(webhookId, updates);

    if (!updatedWebhook) {
      return res.status(404).json({
        success: false,
        message: 'Webhook not found'
      });
    }

    res.json({
      success: true,
      message: 'Webhook updated successfully',
      data: updatedWebhook
    });
  } catch (error) {
    console.error('Error updating webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update webhook',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route DELETE /api/integrations/webhooks/:webhookId
 * @desc Delete a webhook
 * @access Public (in demo, should be protected in production)
 */
router.delete('/webhooks/:webhookId', async (req, res) => {
  try {
    const { webhookId } = req.params;

    if (!webhookId) {
      return res.status(400).json({
        success: false,
        message: 'Webhook ID is required'
      });
    }

    const success = integrationService.deleteWebhook(webhookId);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Webhook not found'
      });
    }

    res.json({
      success: true,
      message: 'Webhook deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete webhook',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/integrations/webhooks/trigger
 * @desc Trigger webhooks for an event
 * @access Public (in demo, should be protected in production)
 */
router.post('/webhooks/trigger', async (req, res) => {
  try {
    const { eventType, eventData, source = 'api' } = req.body;

    if (!eventType) {
      return res.status(400).json({
        success: false,
        message: 'Event type is required'
      });
    }

    console.log(`Triggering webhooks for event: ${eventType}`);

    const event = await integrationService.triggerWebhooks(eventType, eventData || {}, source);

    res.json({
      success: true,
      message: `Webhooks triggered for event: ${eventType}`,
      data: event
    });
  } catch (error) {
    console.error('Error triggering webhooks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger webhooks',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/integrations/extensions
 * @desc Get all API extensions
 * @access Public (in demo, should be protected in production)
 */
router.get('/extensions', async (req, res) => {
  try {
    const extensions = integrationService.getAPIExtensions();

    res.json({
      success: true,
      data: extensions,
      count: extensions.length
    });
  } catch (error) {
    console.error('Error getting API extensions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get API extensions',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/integrations/extensions
 * @desc Create a new API extension
 * @access Public (in demo, should be protected in production)
 */
router.post('/extensions', async (req, res) => {
  try {
    const extensionData = req.body;

    // Validate required fields
    const requiredFields = ['name', 'endpoint', 'method', 'handler'];
    for (const field of requiredFields) {
      if (!extensionData[field]) {
        return res.status(400).json({
          success: false,
          message: `${field} is required`
        });
      }
    }

    // Set defaults
    const extension = {
      description: '',
      authentication: 'none',
      rateLimit: { requests: 100, window: 3600 },
      enabled: true,
      version: '1.0.0',
      ...extensionData
    };

    const createdExtension = integrationService.createAPIExtension(extension);

    res.status(201).json({
      success: true,
      message: 'API extension created successfully',
      data: createdExtension
    });
  } catch (error) {
    console.error('Error creating API extension:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create API extension',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/integrations/reports
 * @desc Get all compliance reports
 * @access Public (in demo, should be protected in production)
 */
router.get('/reports', async (req, res) => {
  try {
    const reports = integrationService.getComplianceReports();

    res.json({
      success: true,
      data: reports,
      count: reports.length
    });
  } catch (error) {
    console.error('Error getting compliance reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get compliance reports',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/integrations/reports
 * @desc Create a new compliance report
 * @access Public (in demo, should be protected in production)
 */
router.post('/reports', async (req, res) => {
  try {
    const reportData = req.body;

    // Validate required fields
    const requiredFields = ['name', 'type', 'format', 'query'];
    for (const field of requiredFields) {
      if (!reportData[field]) {
        return res.status(400).json({
          success: false,
          message: `${field} is required`
        });
      }
    }

    // Set defaults
    const report = {
      schedule: 'manual',
      recipients: [],
      enabled: true,
      ...reportData
    };

    const createdReport = integrationService.createComplianceReport(report);

    res.status(201).json({
      success: true,
      message: 'Compliance report created successfully',
      data: createdReport
    });
  } catch (error) {
    console.error('Error creating compliance report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create compliance report',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/integrations/reports/:reportId/generate
 * @desc Generate a compliance report
 * @access Public (in demo, should be protected in production)
 */
router.post('/reports/:reportId/generate', async (req, res) => {
  try {
    const { reportId } = req.params;

    if (!reportId) {
      return res.status(400).json({
        success: false,
        message: 'Report ID is required'
      });
    }

    console.log(`Generating compliance report: ${reportId}`);

    const reportContent = await integrationService.generateComplianceReport(reportId);

    res.json({
      success: true,
      message: 'Compliance report generated successfully',
      data: {
        reportId,
        content: reportContent,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error generating compliance report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate compliance report',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/integrations/third-party
 * @desc Get all third-party integrations
 * @access Public (in demo, should be protected in production)
 */
router.get('/third-party', async (req, res) => {
  try {
    const integrations = integrationService.getIntegrations();

    res.json({
      success: true,
      data: integrations,
      count: integrations.length
    });
  } catch (error) {
    console.error('Error getting third-party integrations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get third-party integrations',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/integrations/third-party
 * @desc Add a new third-party integration
 * @access Public (in demo, should be protected in production)
 */
router.post('/third-party', async (req, res) => {
  try {
    const integrationData = req.body;

    // Validate required fields
    const requiredFields = ['name', 'type', 'config'];
    for (const field of requiredFields) {
      if (!integrationData[field]) {
        return res.status(400).json({
          success: false,
          message: `${field} is required`
        });
      }
    }

    // Set defaults
    const integration = {
      enabled: true,
      syncInterval: 60,
      ...integrationData
    };

    const createdIntegration = integrationService.addIntegration(integration);

    res.status(201).json({
      success: true,
      message: 'Third-party integration added successfully',
      data: createdIntegration
    });
  } catch (error) {
    console.error('Error adding third-party integration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add third-party integration',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/integrations/third-party/:integrationId/test
 * @desc Test a third-party integration
 * @access Public (in demo, should be protected in production)
 */
router.post('/third-party/:integrationId/test', async (req, res) => {
  try {
    const { integrationId } = req.params;

    if (!integrationId) {
      return res.status(400).json({
        success: false,
        message: 'Integration ID is required'
      });
    }

    console.log(`Testing third-party integration: ${integrationId}`);

    const success = await integrationService.testIntegration(integrationId);

    res.json({
      success: true,
      message: success ? 'Integration test successful' : 'Integration test failed',
      data: {
        integrationId,
        testResult: success,
        testedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error testing third-party integration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test third-party integration',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/integrations/statistics
 * @desc Get integration statistics
 * @access Public (in demo, should be protected in production)
 */
router.get('/statistics', async (req, res) => {
  try {
    const statistics = integrationService.getIntegrationStatistics();

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Error getting integration statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get integration statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/integrations/events
 * @desc Get integration event history
 * @access Public (in demo, should be protected in production)
 */
router.get('/events', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const events = integrationService.getEventHistory();

    // Limit results
    const limitedEvents = events.slice(0, parseInt(limit as string));

    res.json({
      success: true,
      data: limitedEvents,
      count: limitedEvents.length,
      total: events.length
    });
  } catch (error) {
    console.error('Error getting integration events:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get integration events',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/integrations/test
 * @desc Test integration system with sample events
 * @access Public (in demo, should be protected in production)
 */
router.post('/test', async (req, res) => {
  try {
    const { eventType = 'test_event', eventData = { message: 'Test integration event' } } = req.body;

    console.log(`Testing integration system with event: ${eventType}`);

    // Trigger test webhooks
    const event = await integrationService.triggerWebhooks(eventType, eventData, 'test');

    // Get current statistics
    const statistics = integrationService.getIntegrationStatistics();

    res.json({
      success: true,
      message: 'Integration system test completed',
      data: {
        testEvent: event,
        statistics,
        testCompleted: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error testing integration system:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test integration system',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
