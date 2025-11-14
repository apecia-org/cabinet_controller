/**
 * Cabinet Controller
 * Handles HTTP requests and responses for cabinet operations
 */

import cabinetService from '../services/cabinetService.js';

/**
 * Get health check status
 * GET /api/v1/health
 */
export async function getHealth(req, res) {
  try {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'cabinet-api',
      version: '1.0.0'
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message
    });
  }
}

/**
 * Get all cabinet statuses
 * GET /api/v1/cabinet/status
 * Query parameters:
 *   - fresh: if true, requests fresh status from hardware
 */
export async function getCabinetStatus(req, res) {
  try {
    // Check if fresh status is requested
    const requestFresh = req.query.fresh === 'true';

    const status = await cabinetService.getCabinetStatus(requestFresh);

    res.status(200).json({
      status: 'success',
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get cabinet status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get cabinet status',
      error: error.message
    });
  }
}

/**
 * Open selected cabinets
 * POST /api/v1/cabinet/open
 * Body: { "cabinetIds": [1, 2, 3] }
 */
export async function openCabinets(req, res) {
  try {
    const { cabinetIds } = req.body;

    // Validate request body
    if (!cabinetIds) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required field: cabinetIds',
        error: 'cabinetIds array is required in request body'
      });
    }

    if (!Array.isArray(cabinetIds)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid cabinetIds format',
        error: 'cabinetIds must be an array of numbers'
      });
    }

    if (cabinetIds.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Empty cabinetIds array',
        error: 'At least one cabinet ID must be provided'
      });
    }

    // Validate each cabinet ID
    for (let i = 0; i < cabinetIds.length; i++) {
      const id = cabinetIds[i];
      if (!Number.isInteger(id) || id < 0 || id > 255) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid cabinet ID format',
          error: `Cabinet ID at index ${i} must be an integer between 0 and 255, got ${id}`
        });
      }
    }

    // Attempt to open cabinets
    const result = await cabinetService.openCabinets(cabinetIds);

    // Determine response status based on results
    const hasFailures = result.failed && result.failed.length > 0;
    const responseStatus = hasFailures && result.opened.length === 0 ? 500 : 200;

    res.status(responseStatus).json({
      status: 'success',
      message: 'Cabinet operation completed',
      data: {
        opened: result.opened,
        failed: result.failed,
        total: cabinetIds.length,
        successCount: result.opened.length,
        failureCount: result.failed.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Open cabinets error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to open cabinets',
      error: error.message
    });
  }
}

/**
 * Reset cabinet status tracking
 * POST /api/v1/cabinet/reset (internal use)
 */
export async function resetStatus(req, res) {
  try {
    cabinetService.resetStatus();

    res.status(200).json({
      status: 'success',
      message: 'Cabinet status tracking reset',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Reset status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to reset cabinet status',
      error: error.message
    });
  }
}
