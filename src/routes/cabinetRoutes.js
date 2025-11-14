/**
 * Cabinet Routes
 * Defines all API endpoints for cabinet operations
 */

import express from 'express';
import {
  getHealth,
  getCabinetStatus,
  openCabinets,
  resetStatus
} from '../controllers/cabinetController.js';

const router = express.Router();

/**
 * Health check endpoint
 * GET /api/v1/health
 */
router.get('/health', getHealth);

/**
 * Get cabinet status
 * GET /api/v1/cabinet/status
 */
router.get('/cabinet/status', getCabinetStatus);

/**
 * Open cabinets
 * POST /api/v1/cabinet/open
 * Body: { "cabinetIds": [1, 2, 3] }
 */
router.post('/cabinet/open', openCabinets);

/**
 * Reset cabinet status (internal endpoint)
 * POST /api/v1/cabinet/reset
 */
router.post('/cabinet/reset', resetStatus);

export default router;
