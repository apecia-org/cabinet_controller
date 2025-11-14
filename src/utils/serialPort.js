/**
 * Serial Port Utilities
 * Handles CRC8 calculation and serial frame construction
 */

/**
 * Calculate CRC8 checksum using polynomial 0x8C (LSB-first)
 * @param {Buffer} buffer - Data buffer to calculate CRC for
 * @returns {number} CRC8 checksum
 */
function calculateCRC8(buffer) {
  let crc = 0x00;

  for (let byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) {
      if (crc & 0x01) {
        crc = (crc >> 1) ^ 0x8C;
      } else {
        crc >>= 1;
      }
      crc &= 0xFF; // Keep it 8-bit
    }
  }

  return crc;
}

/**
 * Build a serial command frame with header, data, and CRC8 checksum
 * Frame structure: [0xAA, 0x55, dataLength, boardAddress, instruction, ...dataBytes, CRC8]
 * @param {Array<number>} dataBytes - Instruction data bytes
 * @param {number} boardAddress - Board address (default: 0x00)
 * @param {number} instruction - Instruction code (default: 0x51 for open cabinet)
 * @returns {Buffer} Complete frame ready to send to serial port
 */
function buildSerialFrame(dataBytes, boardAddress = 0x00, instruction = 0x51) {
  const header1 = 0xAA;
  const header2 = 0x55;

  // Data length: instruction + board address + data bytes
  const dataLength = 1 + 1 + dataBytes.length;

  // Build frame without CRC
  const frameWithoutCRC = [
    header1,
    header2,
    dataLength,
    boardAddress,
    instruction,
    ...dataBytes
  ];

  // Calculate CRC8 and append
  const crc = calculateCRC8(frameWithoutCRC);
  const fullFrame = [...frameWithoutCRC, crc];

  return Buffer.from(fullFrame);
}

/**
 * Format a buffer as hex string for logging
 * @param {Buffer} buffer - Buffer to format
 * @returns {string} Hex string representation (e.g., "AA 55 03 00 51 A5")
 */
function bufferToHexString(buffer) {
  return buffer.toString('hex').match(/.{1,2}/g).join(' ');
}

/**
 * Parse hex string to byte array
 * @param {string} hexString - Hex string (e.g., "AA 55 03 00 51")
 * @returns {Array<number>} Array of bytes
 */
function hexStringToByteArray(hexString) {
  const cleaned = hexString.replace(/\s+/g, '');
  const result = [];
  for (let i = 0; i < cleaned.length; i += 2) {
    result.push(parseInt(cleaned.substr(i, 2), 16));
  }
  return result;
}

export {
  calculateCRC8,
  buildSerialFrame,
  bufferToHexString,
  hexStringToByteArray
};
