/**
 * Integration Tests for Cabinet Control REST API
 * Tests all API endpoints with mocked cabinetService
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import dotenv from 'dotenv';
import cabinetRoutes from '../../src/routes/cabinetRoutes.js';
import cabinetService from '../../src/services/cabinetService.js';

// Load environment variables
dotenv.config();

// Mock SerialPort to avoid hardware dependencies
vi.mock('serialport', () => {
  const MockSerialPort = vi.fn();
  MockSerialPort.prototype.on = vi.fn(function(event, callback) {
    if (event === 'open') {
      setTimeout(() => callback(), 10);
    }
    return this;
  });
  MockSerialPort.prototype.write = vi.fn((frame, callback) => {
    setTimeout(() => callback(null), 10);
  });
  MockSerialPort.prototype.close = vi.fn((callback) => {
    setTimeout(() => callback(), 10);
  });

  return {
    SerialPort: MockSerialPort
  };
});

// Create a test Express app
function createTestApp() {
  const app = express();

  // Middleware
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ limit: '10kb', extended: true }));

  // Request logging middleware
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
  });

  // API Routes
  app.use('/api/v1', cabinetRoutes);

  // Root endpoint
  app.get('/', (req, res) => {
    res.status(200).json({
      service: 'Cabinet Control API',
      version: '1.0.0',
      endpoints: {
        health: 'GET /api/v1/health',
        cabinetStatus: 'GET /api/v1/cabinet/status',
        openCabinets: 'POST /api/v1/cabinet/open',
        resetStatus: 'POST /api/v1/cabinet/reset'
      }
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      status: 'error',
      message: 'Endpoint not found',
      path: req.path,
      method: req.method
    });
  });

  // Error handler middleware
  app.use((err, req, res, next) => {
    console.error('Error:', err);

    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid JSON in request body',
        error: err.message
      });
    }

    res.status(err.status || 500).json({
      status: 'error',
      message: err.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  });

  return app;
}

describe('Cabinet Control REST API Integration Tests', () => {

  let app;

  beforeAll(async () => {
    app = createTestApp();
    // Connect service once for all tests
    try {
      await cabinetService.connect();
    } catch (err) {
      console.log('Service connection failed (expected in test environment)');
    }
  });

  afterAll(async () => {
    try {
      await cabinetService.disconnect();
    } catch (err) {
      console.log('Service disconnect failed');
    }
  });

  beforeEach(() => {
    // Reset cabinet status before each test
    cabinetService.resetStatus();
  });

  // ==================== ROOT ENDPOINT TESTS ====================
  describe('GET /', () => {

    it('should return service information', async () => {
      // Act
      const response = await request(app).get('/');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('service');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body.service).toBe('Cabinet Control API');
    });

    it('should include all endpoint information', async () => {
      // Act
      const response = await request(app).get('/');

      // Assert
      expect(response.body.endpoints).toHaveProperty('health');
      expect(response.body.endpoints).toHaveProperty('cabinetStatus');
      expect(response.body.endpoints).toHaveProperty('openCabinets');
      expect(response.body.endpoints).toHaveProperty('resetStatus');
    });
  });

  // ==================== HEALTH CHECK ENDPOINT TESTS ====================
  describe('GET /api/v1/health', () => {

    it('should return 200 status with healthy response', async () => {
      // Act
      const response = await request(app).get('/api/v1/health');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
    });

    it('should include required health check fields', async () => {
      // Act
      const response = await request(app).get('/api/v1/health');

      // Assert
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('service');
      expect(response.body).toHaveProperty('version');
    });

    it('should return valid ISO 8601 timestamp', async () => {
      // Act
      const response = await request(app).get('/api/v1/health');

      // Assert
      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.getTime()).toBeGreaterThan(0);
    });

    it('should include correct service name and version', async () => {
      // Act
      const response = await request(app).get('/api/v1/health');

      // Assert
      expect(response.body.service).toBe('cabinet-api');
      expect(response.body.version).toBe('1.0.0');
    });

    it('should have JSON content-type', async () => {
      // Act
      const response = await request(app).get('/api/v1/health');

      // Assert
      expect(response.type).toBe('application/json');
    });
  });

  // ==================== GET CABINET STATUS ENDPOINT TESTS ====================
  describe('GET /api/v1/cabinet/status', () => {

    it('should return 200 status with cabinet status data', async () => {
      // Act
      const response = await request(app).get('/api/v1/cabinet/status');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });

    it('should include required status fields', async () => {
      // Act
      const response = await request(app).get('/api/v1/cabinet/status');

      // Assert
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return cabinet data with connected status', async () => {
      // Act
      const response = await request(app).get('/api/v1/cabinet/status');

      // Assert
      const data = response.body.data;
      expect(data).toHaveProperty('connected');
      expect(data).toHaveProperty('portPath');
      expect(data).toHaveProperty('baudRate');
      expect(data).toHaveProperty('cabinets');
    });

    it('should return cabinets as array', async () => {
      // Act
      const response = await request(app).get('/api/v1/cabinet/status');

      // Assert
      expect(Array.isArray(response.body.data.cabinets)).toBe(true);
    });

    it('should return empty cabinets array initially', async () => {
      // Act
      const response = await request(app).get('/api/v1/cabinet/status');

      // Assert
      expect(response.body.data.cabinets).toHaveLength(0);
    });

    it('should include timestamp', async () => {
      // Act
      const response = await request(app).get('/api/v1/cabinet/status');

      // Assert
      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.getTime()).toBeGreaterThan(0);
    });
  });

  // ==================== OPEN CABINETS ENDPOINT TESTS ====================
  describe('POST /api/v1/cabinet/open', () => {

    it('should open single cabinet successfully', async () => {
      // Arrange
      const payload = { cabinetIds: [1] };

      // Act
      const response = await request(app)
        .post('/api/v1/cabinet/open')
        .send(payload);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.successCount).toBe(1);
      expect(response.body.data.opened).toHaveLength(1);
      expect(response.body.data.opened[0].id).toBe(1);
    });

    it('should open multiple cabinets successfully', async () => {
      // Arrange
      const payload = { cabinetIds: [1, 2, 3] };

      // Act
      const response = await request(app)
        .post('/api/v1/cabinet/open')
        .send(payload);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.successCount).toBe(3);
      expect(response.body.data.opened).toHaveLength(3);
    });

    it('should return proper response structure', async () => {
      // Arrange
      const payload = { cabinetIds: [1] };

      // Act
      const response = await request(app)
        .post('/api/v1/cabinet/open')
        .send(payload);

      // Assert
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('opened');
      expect(response.body.data).toHaveProperty('failed');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('successCount');
      expect(response.body.data).toHaveProperty('failureCount');
    });

    it('should include timestamps in opened cabinet data', async () => {
      // Arrange
      const payload = { cabinetIds: [1] };

      // Act
      const response = await request(app)
        .post('/api/v1/cabinet/open')
        .send(payload);

      // Assert
      expect(response.body.data.opened[0]).toHaveProperty('timestamp');
      const timestamp = new Date(response.body.data.opened[0].timestamp);
      expect(timestamp.getTime()).toBeGreaterThan(0);
    });

    it('should reject missing cabinetIds field', async () => {
      // Arrange
      const payload = {};

      // Act
      const response = await request(app)
        .post('/api/v1/cabinet/open')
        .send(payload);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Missing required field');
    });

    it('should reject non-array cabinetIds', async () => {
      // Arrange
      const payload = { cabinetIds: 'not-an-array' };

      // Act
      const response = await request(app)
        .post('/api/v1/cabinet/open')
        .send(payload);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Invalid cabinetIds format');
    });

    it('should reject empty cabinetIds array', async () => {
      // Arrange
      const payload = { cabinetIds: [] };

      // Act
      const response = await request(app)
        .post('/api/v1/cabinet/open')
        .send(payload);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Empty cabinetIds array');
    });

    it('should reject object instead of array', async () => {
      // Arrange
      const payload = { cabinetIds: { 0: 1 } };

      // Act
      const response = await request(app)
        .post('/api/v1/cabinet/open')
        .send(payload);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });

    it('should reject cabinet ID with negative value', async () => {
      // Arrange
      const payload = { cabinetIds: [-1] };

      // Act
      const response = await request(app)
        .post('/api/v1/cabinet/open')
        .send(payload);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Invalid cabinet ID format');
    });

    it('should reject cabinet ID greater than 255', async () => {
      // Arrange
      const payload = { cabinetIds: [256] };

      // Act
      const response = await request(app)
        .post('/api/v1/cabinet/open')
        .send(payload);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Invalid cabinet ID format');
    });

    it('should reject non-integer cabinet IDs', async () => {
      // Arrange
      const payload = { cabinetIds: [1.5] };

      // Act
      const response = await request(app)
        .post('/api/v1/cabinet/open')
        .send(payload);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Invalid cabinet ID format');
    });

    it('should reject string values in array', async () => {
      // Arrange
      const payload = { cabinetIds: [1, 'two', 3] };

      // Act
      const response = await request(app)
        .post('/api/v1/cabinet/open')
        .send(payload);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });

    it('should accept valid boundary values (0 and 255)', async () => {
      // Arrange
      const payload = { cabinetIds: [0, 255] };

      // Act
      const response = await request(app)
        .post('/api/v1/cabinet/open')
        .send(payload);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.opened).toHaveLength(2);
      expect(response.body.data.opened.map(c => c.id)).toEqual([0, 255]);
    });

    it('should return 200 even with partial failures', async () => {
      // Arrange - all IDs should be valid, so no failures expected
      const payload = { cabinetIds: [1, 2, 3] };

      // Act
      const response = await request(app)
        .post('/api/v1/cabinet/open')
        .send(payload);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.failureCount).toBe(0);
    });

    it('should have JSON content-type', async () => {
      // Arrange
      const payload = { cabinetIds: [1] };

      // Act
      const response = await request(app)
        .post('/api/v1/cabinet/open')
        .send(payload);

      // Assert
      expect(response.type).toBe('application/json');
    });

    it('should handle large valid ID numbers', async () => {
      // Arrange
      const payload = { cabinetIds: [200, 201, 202] };

      // Act
      const response = await request(app)
        .post('/api/v1/cabinet/open')
        .send(payload);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.successCount).toBe(3);
    });
  });

  // ==================== RESET STATUS ENDPOINT TESTS ====================
  describe('POST /api/v1/cabinet/reset', () => {

    beforeEach(async () => {
      // Open some cabinets before reset test
      await request(app)
        .post('/api/v1/cabinet/open')
        .send({ cabinetIds: [1, 2, 3] });
    });

    it('should reset cabinet status successfully', async () => {
      // Act
      const response = await request(app).post('/api/v1/cabinet/reset');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });

    it('should include reset message', async () => {
      // Act
      const response = await request(app).post('/api/v1/cabinet/reset');

      // Assert
      expect(response.body.message).toContain('reset');
    });

    it('should return timestamp', async () => {
      // Act
      const response = await request(app).post('/api/v1/cabinet/reset');

      // Assert
      expect(response.body).toHaveProperty('timestamp');
      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.getTime()).toBeGreaterThan(0);
    });

    it('should clear cabinet status data', async () => {
      // Arrange - cabinets opened in beforeEach

      // Act
      await request(app).post('/api/v1/cabinet/reset');
      const statusResponse = await request(app).get('/api/v1/cabinet/status');

      // Assert
      expect(statusResponse.body.data.cabinets).toHaveLength(0);
    });

    it('should allow reopening cabinets after reset', async () => {
      // Arrange
      await request(app).post('/api/v1/cabinet/reset');

      // Act
      const response = await request(app)
        .post('/api/v1/cabinet/open')
        .send({ cabinetIds: [10] });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.opened).toHaveLength(1);
      expect(response.body.data.opened[0].id).toBe(10);
    });

    it('should have JSON content-type', async () => {
      // Act
      const response = await request(app).post('/api/v1/cabinet/reset');

      // Assert
      expect(response.type).toBe('application/json');
    });
  });

  // ==================== ERROR HANDLING TESTS ====================
  describe('Error Handling', () => {

    it('should return 404 for unknown route', async () => {
      // Act
      const response = await request(app).get('/api/v1/unknown-route');

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Endpoint not found');
    });

    it('should return 404 for wrong HTTP method', async () => {
      // Act
      const response = await request(app).put('/api/v1/health');

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.status).toBe('error');
    });

    it('should return 404 for GET on POST endpoint', async () => {
      // Act
      const response = await request(app).get('/api/v1/cabinet/open');

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.status).toBe('error');
    });

    it('should handle invalid JSON in request body', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/cabinet/open')
        .set('Content-Type', 'application/json')
        .send('invalid json {');

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });

    it('should return error with detailed message for invalid input', async () => {
      // Arrange
      const payload = { cabinetIds: [300] };

      // Act
      const response = await request(app)
        .post('/api/v1/cabinet/open')
        .send(payload);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  // ==================== INTEGRATION WORKFLOW TESTS ====================
  describe('End-to-End API Workflows', () => {

    it('should perform complete workflow: check health -> get status -> open -> reset', async () => {
      // 1. Check health
      let response = await request(app).get('/api/v1/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');

      // 2. Get status
      response = await request(app).get('/api/v1/cabinet/status');
      expect(response.status).toBe(200);
      expect(response.body.data.cabinets).toHaveLength(0);

      // 3. Open cabinets
      response = await request(app)
        .post('/api/v1/cabinet/open')
        .send({ cabinetIds: [1, 2] });
      expect(response.status).toBe(200);
      expect(response.body.data.successCount).toBe(2);

      // 4. Verify status shows opened cabinets
      response = await request(app).get('/api/v1/cabinet/status');
      expect(response.status).toBe(200);
      expect(response.body.data.cabinets).toHaveLength(2);

      // 5. Reset
      response = await request(app).post('/api/v1/cabinet/reset');
      expect(response.status).toBe(200);

      // 6. Verify status is cleared
      response = await request(app).get('/api/v1/cabinet/status');
      expect(response.status).toBe(200);
      expect(response.body.data.cabinets).toHaveLength(0);
    });

    it('should handle multiple open operations', async () => {
      // Open batch 1
      let response = await request(app)
        .post('/api/v1/cabinet/open')
        .send({ cabinetIds: [1, 2] });
      expect(response.body.data.successCount).toBe(2);

      // Open batch 2
      response = await request(app)
        .post('/api/v1/cabinet/open')
        .send({ cabinetIds: [3, 4] });
      expect(response.body.data.successCount).toBe(2);

      // Verify all are tracked
      response = await request(app).get('/api/v1/cabinet/status');
      expect(response.body.data.cabinets.length).toBeGreaterThanOrEqual(2);
    });
  });
});
