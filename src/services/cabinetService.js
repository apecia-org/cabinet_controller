/**
 * Cabinet Service
 * Manages serial port communication and cabinet operations
 */

import { SerialPort } from 'serialport';
import { buildSerialFrame, bufferToHexString, calculateCRC8 } from '../utils/serialPort.js';

class CabinetService {
  constructor() {
    this.port = null;
    this.isConnected = false;
    this.portPath = process.env.SERIAL_PORT || 'COM1';
    this.baudRate = parseInt(process.env.BAUD_RATE || '9600');
    this.cabinetStatus = {};
    this.responseBuffer = Buffer.alloc(0);
    this.lastStatusUpdate = null;
    this.statusRequestTimeout = null;
  }

  /**
   * Connect to serial port
   * @returns {Promise<void>}
   */
  async connect() {
    return new Promise((resolve, reject) => {
      try {
        this.port = new SerialPort({
          path: this.portPath,
          baudRate: this.baudRate,
          dataBits: 8,
          stopBits: 1,
          parity: 'none'
        });

        this.port.on('open', () => {
          console.log(`Serial port opened: ${this.portPath} at ${this.baudRate} baud`);
          this.isConnected = true;
          resolve();
        });

        this.port.on('error', (err) => {
          console.error('Serial port error:', err.message);
          this.isConnected = false;
          reject(err);
        });

        this.port.on('data', (data) => {
          this.responseBuffer = Buffer.concat([this.responseBuffer, data]);
          this.parseResponse(this.responseBuffer);
        });

      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Disconnect from serial port
   * @returns {Promise<void>}
   */
  async disconnect() {
    return new Promise((resolve) => {
      // Clear any pending timeouts
      if (this.statusRequestTimeout) {
        clearTimeout(this.statusRequestTimeout);
        this.statusRequestTimeout = null;
      }

      if (this.port && this.isConnected) {
        this.port.close(() => {
          this.isConnected = false;
          console.log('Serial port closed');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Send raw frame to serial port
   * @param {Buffer} frame - Serial frame to send
   * @returns {Promise<void>}
   */
  async sendFrame(frame) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected || !this.port) {
        return reject(new Error('Serial port not connected'));
      }

      this.port.write(frame, (err) => {
        if (err) {
          console.error('Error writing to serial port:', err.message);
          reject(err);
        } else {
          console.log('Frame sent:', bufferToHexString(frame));
          resolve();
        }
      });
    });
  }

  /**
   * Open specified cabinets by sending frame with cabinet IDs
   * @param {Array<number>} cabinetIds - Array of cabinet IDs (0-255)
   * @returns {Promise<Object>} Result with opened cabinet IDs
   */
  async openCabinets(cabinetIds) {
    if (!Array.isArray(cabinetIds) || cabinetIds.length === 0) {
      throw new Error('Cabinet IDs must be a non-empty array');
    }

    // Validate cabinet IDs
    for (const id of cabinetIds) {
      if (!Number.isInteger(id) || id < 0 || id > 0xFF) {
        throw new Error(`Invalid cabinet ID: ${id}. Must be between 0 and 255`);
      }
    }

    try {
      const results = {
        opened: [],
        failed: []
      };

      // Send frame for each cabinet ID with 500ms delay between sends
      for (const cabinetId of cabinetIds) {
        try {
          const frame = buildSerialFrame([cabinetId]);
          await this.sendFrame(frame);

          // Add to tracking
          this.cabinetStatus[cabinetId] = {
            id: cabinetId,
            status: 'opened',
            timestamp: new Date().toISOString()
          };

          results.opened.push({
            id: cabinetId,
            status: 'opened',
            timestamp: new Date().toISOString()
          });

          // Small delay between sends
          await this.delay(100);
        } catch (err) {
          results.failed.push({
            id: cabinetId,
            error: err.message
          });
        }
      }

      return results;
    } catch (err) {
      throw new Error(`Failed to open cabinets: ${err.message}`);
    }
  }

  /**
   * Request current cabinet status from hardware
   * Sends a status query command (instruction 0x50) to request status update
   * @returns {Promise<void>}
   */
  async requestStatus() {
    if (!this.isConnected || !this.port) {
      throw new Error('Serial port not connected');
    }

    try {
      // Build status request frame (instruction 0x50, no data bytes)
      const frame = buildSerialFrame([], 0x00, 0x50);
      console.log('Requesting status from hardware...');
      await this.sendFrame(frame);

      // Set a timeout to wait for response
      return new Promise((resolve, reject) => {
        this.statusRequestTimeout = setTimeout(() => {
          console.warn('Status request timeout - no response from hardware within 2 seconds');
          resolve(); // Resolve anyway, status may update later
        }, 2000);
      });
    } catch (err) {
      throw new Error(`Failed to request status: ${err.message}`);
    }
  }

  /**
   * Get all cabinet statuses
   * Returns the last parsed status from hardware
   * @param {boolean} requestFresh - If true, requests status from hardware first
   * @returns {Promise<Object>|Object} Object containing all cabinet statuses
   */
  async getCabinetStatus(requestFresh = false) {
    if (requestFresh && this.isConnected) {
      try {
        await this.requestStatus();
      } catch (err) {
        console.error('Error requesting fresh status:', err.message);
        // Fall through and return cached status
      }
    }

    return {
      connected: this.isConnected,
      portPath: this.portPath,
      baudRate: this.baudRate,
      lastUpdate: this.lastStatusUpdate,
      cabinets: Object.values(this.cabinetStatus)
    };
  }

  /**
   * Validate and extract a complete frame from the buffer
   * @param {Buffer} buffer - Response buffer
   * @returns {Object|null} { frame: Buffer, remaining: Buffer } or null if invalid
   * @private
   */
  extractFrame(buffer) {
    // Check for minimum frame size
    if (buffer.length < 6) {
      return null;
    }

    // Check for header
    if (buffer[0] !== 0xAA || buffer[1] !== 0x55) {
      // Invalid header - skip first byte and try again
      return null;
    }

    const dataLength = buffer[2];
    const frameLength = 3 + dataLength + 1; // header(2) + length(1) + data + crc(1)

    if (buffer.length < frameLength) {
      // Incomplete frame
      return null;
    }

    const frame = buffer.subarray(0, frameLength);

    // Validate CRC
    if (!this.validateFrameCRC(frame)) {
      console.error('CRC validation failed for frame:', bufferToHexString(frame));
      // Return frame anyway but mark as invalid
      return {
        frame,
        remaining: buffer.subarray(frameLength),
        valid: false
      };
    }

    return {
      frame,
      remaining: buffer.subarray(frameLength),
      valid: true
    };
  }

  /**
   * Validate CRC8 checksum of a frame
   * Frame structure: [header1, header2, length, ...data, crc]
   * @param {Buffer} frame - Complete frame including CRC
   * @returns {boolean} True if CRC is valid
   * @private
   */
  validateFrameCRC(frame) {
    if (frame.length < 4) return false;

    const frameWithoutCRC = frame.subarray(0, frame.length - 1);
    const expectedCRC = frame[frame.length - 1];
    const calculatedCRC = calculateCRC8(frameWithoutCRC);

    return calculatedCRC === expectedCRC;
  }

  /**
   * Parse status response frame
   * Frame structure: [0xAA, 0x55, 0x08, 0x00, 0x51, statusByte1-6, crc8]
   * Each status byte contains bit-mapped cabinet statuses
   * @param {Buffer} frame - Complete status response frame
   * @returns {Object} Parsed status with cabinet ID mapping
   * @private
   */
  parseStatusResponse(frame) {
    if (frame.length < 12) {
      console.error('Invalid status frame length:', frame.length);
      return null;
    }

    const dataLength = frame[2];
    if (dataLength < 8) {
      console.error('Invalid status data length:', dataLength);
      return null;
    }

    // Extract status bytes (indices 5-10 for 6 status bytes)
    const statusBytes = [];
    for (let i = 5; i < 5 + 6 && i < frame.length - 1; i++) {
      statusBytes.push(frame[i]);
    }

    // Parse individual cabinet statuses from bit-mapped status bytes
    const parsedStatuses = {};

    for (let byteIndex = 0; byteIndex < statusBytes.length; byteIndex++) {
      const byte = statusBytes[byteIndex];

      // Each byte represents 8 cabinets
      for (let bitIndex = 0; bitIndex < 8; bitIndex++) {
        // Extract bit value (0 = closed/unavailable, 1 = open/available)
        const bitValue = (byte >> bitIndex) & 0x01;
        const cabinetId = byteIndex * 8 + bitIndex;

        parsedStatuses[cabinetId] = {
          id: cabinetId,
          status: bitValue === 1 ? 'available' : 'unavailable',
          statusByte: byteIndex,
          statusBit: bitIndex,
          rawBit: bitValue,
          timestamp: new Date().toISOString()
        };
      }
    }

    return {
      timestamp: new Date().toISOString(),
      statusBytes: statusBytes,
      cabinets: parsedStatuses,
      totalCabinets: statusBytes.length * 8
    };
  }

  /**
   * Parse response data from serial port
   * @param {Buffer} buffer - Response buffer
   * @private
   */
  parseResponse(buffer) {
    // Keep extracting frames while we have complete data
    let currentBuffer = buffer;

    while (currentBuffer.length > 0) {
      const extraction = this.extractFrame(currentBuffer);

      if (!extraction) {
        // No complete frame found, update buffer and exit
        this.responseBuffer = currentBuffer;
        return;
      }

      const { frame, remaining, valid } = extraction;

      if (!valid) {
        console.error('Invalid frame received:', bufferToHexString(frame));
        currentBuffer = remaining;
        continue;
      }

      // Log received frame
      console.log('Valid frame received:', bufferToHexString(frame));

      // Check frame type and handle accordingly
      if (frame.length >= 5) {
        const commandType = frame[4]; // Command/response type at index 4

        if (commandType === 0x51) {
          // Status response frame
          const parsedStatus = this.parseStatusResponse(frame);
          if (parsedStatus) {
            this.updateCabinetStatus(parsedStatus);
            this.lastStatusUpdate = new Date();
          }
        }
        // Other command types can be handled here in the future
      }

      currentBuffer = remaining;
    }

    this.responseBuffer = currentBuffer;
  }

  /**
   * Update internal cabinet status with parsed hardware response
   * @param {Object} parsedStatus - Parsed status from hardware
   * @private
   */
  updateCabinetStatus(parsedStatus) {
    for (const [cabinetId, statusInfo] of Object.entries(parsedStatus.cabinets)) {
      this.cabinetStatus[cabinetId] = statusInfo;
    }
  }

  /**
   * Utility delay function
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   * @private
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Reset cabinet status tracking
   */
  resetStatus() {
    this.cabinetStatus = {};
  }
}

// Export singleton instance
export default new CabinetService();
