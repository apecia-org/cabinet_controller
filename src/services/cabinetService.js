/**
 * Cabinet Service
 * Manages serial port communication and cabinet operations
 */

import { SerialPort } from 'serialport';
import { buildSerialFrame, bufferToHexString } from '../utils/serialPort.js';

class CabinetService {
  constructor() {
    this.port = null;
    this.isConnected = false;
    this.portPath = process.env.SERIAL_PORT || 'COM3';
    this.baudRate = parseInt(process.env.BAUD_RATE || '9600');
    this.cabinetStatus = {};
    this.responseBuffer = Buffer.alloc(0);
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
   * Get all cabinet statuses
   * @returns {Object} Object containing all cabinet statuses
   */
  getCabinetStatus() {
    return {
      connected: this.isConnected,
      portPath: this.portPath,
      baudRate: this.baudRate,
      cabinets: Object.values(this.cabinetStatus)
    };
  }

  /**
   * Parse response data from serial port
   * @param {Buffer} buffer - Response buffer
   * @private
   */
  parseResponse(buffer) {
    // Check for valid frame structure
    if (buffer.length < 6) {
      return;
    }

    // Check for header
    if (buffer[0] !== 0xAA || buffer[1] !== 0x55) {
      // Remove invalid data
      this.responseBuffer = Buffer.alloc(0);
      return;
    }

    const dataLength = buffer[2];
    const frameLength = 3 + dataLength + 1; // header(2) + length(1) + data + crc(1)

    if (buffer.length >= frameLength) {
      console.log('Valid response received:', bufferToHexString(buffer.subarray(0, frameLength)));
      // Clear processed data
      this.responseBuffer = buffer.subarray(frameLength);
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
