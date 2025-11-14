/**
 * Unit Tests for Cabinet Service
 * Tests cabinetService with mocked SerialPort to avoid hardware dependencies
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import cabinetService from '../../src/services/cabinetService.js';

// Mock SerialPort module
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

describe('CabinetService Unit Tests', () => {

  beforeEach(() => {
    // Reset service state before each test
    cabinetService.port = null;
    cabinetService.isConnected = false;
    cabinetService.cabinetStatus = {};
    cabinetService.responseBuffer = Buffer.alloc(0);
  });

  afterEach(() => {
    // Clean up after each test
    vi.clearAllMocks();
  });

  // ==================== CONNECTION TESTS ====================
  describe('Serial Port Connection', () => {

    it('should initialize with default configuration', () => {
      // Arrange & Act
      const service = cabinetService;

      // Assert
      expect(service.isConnected).toBe(false);
      expect(service.portPath).toBeDefined();
      expect(service.baudRate).toBeGreaterThan(0);
    });

    it('should connect to serial port successfully', async () => {
      // Arrange
      const service = cabinetService;

      // Act
      await service.connect();

      // Assert
      expect(service.isConnected).toBe(true);
      expect(service.port).toBeDefined();
    });

    it('should disconnect from serial port successfully', async () => {
      // Arrange
      const service = cabinetService;
      await service.connect();
      expect(service.isConnected).toBe(true);

      // Act
      await service.disconnect();

      // Assert
      expect(service.isConnected).toBe(false);
    });

    it('should handle disconnect when port is not connected', async () => {
      // Arrange
      const service = cabinetService;
      expect(service.isConnected).toBe(false);

      // Act & Assert (should not throw)
      await expect(service.disconnect()).resolves.toBeUndefined();
    });
  });

  // ==================== CABINET OPENING TESTS ====================
  describe('openCabinets()', () => {

    beforeEach(async () => {
      await cabinetService.connect();
    });

    afterEach(async () => {
      await cabinetService.disconnect();
    });

    it('should open a single cabinet successfully', async () => {
      // Arrange
      const cabinetIds = [1];

      // Act
      const result = await cabinetService.openCabinets(cabinetIds);

      // Assert
      expect(result.opened).toHaveLength(1);
      expect(result.opened[0].id).toBe(1);
      expect(result.opened[0].status).toBe('opened');
      expect(result.failed).toHaveLength(0);
    });

    it('should open multiple cabinets successfully', async () => {
      // Arrange
      const cabinetIds = [1, 2, 3];

      // Act
      const result = await cabinetService.openCabinets(cabinetIds);

      // Assert
      expect(result.opened).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
      expect(result.opened.map(c => c.id)).toEqual([1, 2, 3]);
    });

    it('should update cabinetStatus after opening', async () => {
      // Arrange
      const cabinetIds = [5];

      // Act
      await cabinetService.openCabinets(cabinetIds);

      // Assert
      expect(cabinetService.cabinetStatus[5]).toBeDefined();
      expect(cabinetService.cabinetStatus[5].status).toBe('opened');
      expect(cabinetService.cabinetStatus[5].timestamp).toBeDefined();
    });

    it('should reject empty cabinetIds array', async () => {
      // Arrange
      const cabinetIds = [];

      // Act & Assert
      await expect(cabinetService.openCabinets(cabinetIds)).rejects.toThrow(
        'Cabinet IDs must be a non-empty array'
      );
    });

    it('should reject non-array input', async () => {
      // Arrange
      const cabinetIds = 'not-an-array';

      // Act & Assert
      await expect(cabinetService.openCabinets(cabinetIds)).rejects.toThrow(
        'Cabinet IDs must be a non-empty array'
      );
    });

    it('should reject null cabinetIds', async () => {
      // Arrange
      const cabinetIds = null;

      // Act & Assert
      await expect(cabinetService.openCabinets(cabinetIds)).rejects.toThrow(
        'Cabinet IDs must be a non-empty array'
      );
    });

    it('should reject cabinet ID with negative value', async () => {
      // Arrange
      const cabinetIds = [-1];

      // Act & Assert
      await expect(cabinetService.openCabinets(cabinetIds)).rejects.toThrow(
        'Invalid cabinet ID: -1'
      );
    });

    it('should reject cabinet ID greater than 255', async () => {
      // Arrange
      const cabinetIds = [256];

      // Act & Assert
      await expect(cabinetService.openCabinets(cabinetIds)).rejects.toThrow(
        'Invalid cabinet ID: 256'
      );
    });

    it('should reject non-integer cabinet IDs', async () => {
      // Arrange
      const cabinetIds = [1.5];

      // Act & Assert
      await expect(cabinetService.openCabinets(cabinetIds)).rejects.toThrow(
        'Invalid cabinet ID: 1.5'
      );
    });

    it('should reject non-number values in array', async () => {
      // Arrange
      const cabinetIds = [1, 'two', 3];

      // Act & Assert
      await expect(cabinetService.openCabinets(cabinetIds)).rejects.toThrow(
        'Invalid cabinet ID: two'
      );
    });

    it('should handle valid boundary values (0 and 255)', async () => {
      // Arrange
      const cabinetIds = [0, 255];

      // Act
      const result = await cabinetService.openCabinets(cabinetIds);

      // Assert
      expect(result.opened).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      expect(result.opened.map(c => c.id)).toEqual([0, 255]);
    });

    it('should include timestamp in opened cabinet result', async () => {
      // Arrange
      const cabinetIds = [1];

      // Act
      const result = await cabinetService.openCabinets(cabinetIds);

      // Assert
      expect(result.opened[0].timestamp).toBeDefined();
      expect(typeof result.opened[0].timestamp).toBe('string');
      // Verify timestamp is a valid ISO 8601 string
      expect(new Date(result.opened[0].timestamp).getTime()).toBeGreaterThan(0);
    });

    it('should send frame for each cabinet ID', async () => {
      // Arrange
      const cabinetIds = [1, 2, 3];
      const sendFrameSpy = vi.spyOn(cabinetService, 'sendFrame').mockResolvedValue();

      // Act
      await cabinetService.openCabinets(cabinetIds);

      // Assert
      expect(sendFrameSpy).toHaveBeenCalledTimes(3);
      sendFrameSpy.mockRestore();
    });
  });

  // ==================== STATUS TESTS ====================
  describe('getCabinetStatus()', () => {

    it('should return status object with correct structure', () => {
      // Act
      const status = cabinetService.getCabinetStatus();

      // Assert
      expect(status).toHaveProperty('connected');
      expect(status).toHaveProperty('portPath');
      expect(status).toHaveProperty('baudRate');
      expect(status).toHaveProperty('cabinets');
      expect(Array.isArray(status.cabinets)).toBe(true);
    });

    it('should return empty cabinets array initially', () => {
      // Act
      const status = cabinetService.getCabinetStatus();

      // Assert
      expect(status.cabinets).toHaveLength(0);
    });

    it('should include opened cabinets in status', async () => {
      // Arrange
      await cabinetService.connect();
      await cabinetService.openCabinets([1, 2]);

      // Act
      const status = cabinetService.getCabinetStatus();

      // Assert
      expect(status.cabinets).toHaveLength(2);
      expect(status.cabinets[0].id).toBe(1);
      expect(status.cabinets[0].status).toBe('opened');

      await cabinetService.disconnect();
    });

    it('should reflect connected status correctly', async () => {
      // Arrange & Act
      let status = cabinetService.getCabinetStatus();

      // Assert (disconnected)
      expect(status.connected).toBe(false);

      // Arrange & Act
      await cabinetService.connect();
      status = cabinetService.getCabinetStatus();

      // Assert (connected)
      expect(status.connected).toBe(true);

      await cabinetService.disconnect();
    });

    it('should include port configuration in status', () => {
      // Act
      const status = cabinetService.getCabinetStatus();

      // Assert
      expect(status.portPath).toBeDefined();
      expect(status.baudRate).toBeGreaterThan(0);
    });
  });

  // ==================== RESET TESTS ====================
  describe('resetStatus()', () => {

    it('should clear all cabinet status data', async () => {
      // Arrange
      await cabinetService.connect();
      await cabinetService.openCabinets([1, 2, 3]);
      expect(cabinetService.cabinetStatus).toHaveProperty('1');

      // Act
      cabinetService.resetStatus();

      // Assert
      expect(Object.keys(cabinetService.cabinetStatus)).toHaveLength(0);

      await cabinetService.disconnect();
    });

    it('should clear cabinet status even if none exist', () => {
      // Arrange
      cabinetService.cabinetStatus = {};

      // Act & Assert (should not throw)
      expect(() => {
        cabinetService.resetStatus();
      }).not.toThrow();
    });

    it('should allow reopening cabinets after reset', async () => {
      // Arrange
      await cabinetService.connect();
      await cabinetService.openCabinets([1]);
      cabinetService.resetStatus();

      // Act
      const result = await cabinetService.openCabinets([2]);

      // Assert
      expect(cabinetService.cabinetStatus).not.toHaveProperty('1');
      expect(cabinetService.cabinetStatus).toHaveProperty('2');

      await cabinetService.disconnect();
    });
  });

  // ==================== PARSE RESPONSE TESTS ====================
  describe('parseResponse()', () => {

    it('should ignore buffer shorter than 6 bytes', () => {
      // Arrange
      const shortBuffer = Buffer.from([0xAA, 0x55]);

      // Act & Assert (should not throw)
      expect(() => {
        cabinetService.parseResponse(shortBuffer);
      }).not.toThrow();
    });

    it('should clear buffer with invalid header', () => {
      // Arrange
      const invalidBuffer = Buffer.from([0xFF, 0xFF, 0x03, 0x00, 0x51, 0xA5]);

      // Act
      cabinetService.parseResponse(invalidBuffer);

      // Assert
      expect(cabinetService.responseBuffer.length).toBe(0);
    });

    it('should recognize valid frame header', () => {
      // Arrange
      const validBuffer = Buffer.from([0xAA, 0x55, 0x03, 0x00, 0x51, 0xA5]);
      cabinetService.responseBuffer = Buffer.alloc(0);

      // Act
      cabinetService.parseResponse(validBuffer);

      // Assert
      // Buffer should be processed (cleared after valid frame)
      expect(cabinetService.responseBuffer.length).toBe(0);
    });

    it('should handle incomplete frame gracefully', () => {
      // Arrange
      const incompleteBuffer = Buffer.from([0xAA, 0x55, 0x05]);

      // Act & Assert (should not throw)
      expect(() => {
        cabinetService.parseResponse(incompleteBuffer);
      }).not.toThrow();
    });
  });

  // ==================== UTILITY TESTS ====================
  describe('delay()', () => {

    it('should resolve after specified milliseconds', async () => {
      // Arrange
      const start = Date.now();

      // Act
      await cabinetService.delay(50);
      const elapsed = Date.now() - start;

      // Assert
      expect(elapsed).toBeGreaterThanOrEqual(50);
      expect(elapsed).toBeLessThan(100); // Allow some tolerance
    });

    it('should return a Promise', () => {
      // Act
      const result = cabinetService.delay(10);

      // Assert
      expect(result instanceof Promise).toBe(true);
    });
  });

  // ==================== INTEGRATION-STYLE TESTS ====================
  describe('End-to-End Service Flow', () => {

    it('should complete full workflow: connect -> open -> check status -> reset -> disconnect', async () => {
      // Arrange
      let service = cabinetService;

      // Act & Assert
      // 1. Connect
      await service.connect();
      expect(service.isConnected).toBe(true);

      // 2. Open cabinets
      const openResult = await service.openCabinets([1, 2]);
      expect(openResult.opened).toHaveLength(2);

      // 3. Check status
      const status = service.getCabinetStatus();
      expect(status.cabinets).toHaveLength(2);
      expect(status.connected).toBe(true);

      // 4. Reset
      service.resetStatus();
      const resetStatus = service.getCabinetStatus();
      expect(resetStatus.cabinets).toHaveLength(0);

      // 5. Disconnect
      await service.disconnect();
      expect(service.isConnected).toBe(false);
    });
  });
});
