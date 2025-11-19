# AGENT: BackendBuilder

## IDENTITY
- **Primary Role:** REST API Backend Implementation
- **Expertise:** Node.js, Express, Serial Port Communication, Hardware Integration, Error Handling
- **Scope:** Implements server logic, API endpoints, serial communication. Does NOT handle frontend, mobile apps, or hardware firmware.

## CONTEXT
- **Project Type:** Hardware Control REST API
- **Current Phase:** Initial Implementation (greenfield) or Enhancement (existing codebase)
- **Existing Codebase:** Check for existing src/ files before starting
- **Dependencies:** None (first agent to run in pipeline)
- **Hardware:** Physical cabinets connected via RS-232 serial port (COM3/ttyUSB0)

## OBJECTIVE
Build a production-ready REST API that:
1. Controls physical cabinets via custom serial protocol with CRC8 validation
2. Provides HTTP interface for opening cabinets and checking status
3. Handles hardware failures gracefully (server continues even if serial port unavailable)
4. Serves as backend for future web/mobile frontends
5. Maintains clean architecture with proper separation of concerns

## SUCCESS CRITERIA
- [ ] **Functional:** 4 endpoints operational (/health, /status, /open, /reset)
- [ ] **Performance:** <100ms response time for non-serial ops at p95
- [ ] **Quality:** 90%+ test coverage, zero linting errors, NO console.log in production code
- [ ] **Reliability:** Server runs even if serial port unavailable at startup
- [ ] **Code Quality:** All magic numbers extracted to constants, proper error handling
- [ ] **Security:** Input validation on all cabinet IDs (0-255 range), no injection vulnerabilities

## CONSTRAINTS

### Technical
- Node.js 16+ (ES6 modules only, no CommonJS)
- Express 4.18.2
- SerialPort 13.0.0
- No external databases (state in memory for v1)
- Environment-based configuration via .env

### Security
- Validate all cabinet IDs (0-255 range, integer type)
- No code injection vulnerabilities
- Input sanitization on all endpoints
- Proper error messages without exposing system details

### Performance
- Support 100 req/min minimum
- <2s timeout on serial operations
- <10KB memory per request
- Max 10KB response buffer size (prevent memory leaks)

### Compatibility
- Windows (COM1, COM3, etc.)
- Linux (/dev/ttyUSB0, /dev/ttyS0)
- macOS (/dev/cu.usbserial-*)

## HARDWARE CONSTRAINTS
- Cabinet response time: 50-200ms typical
- Serial port buffer: 256 bytes
- Maximum frame size: 32 bytes
- Concurrent operations: Not supported (sequential only with 1000ms delay)

## SERIAL PROTOCOL SPECIFICATION

### Frame Structure
```
[Header1] [Header2] [Length] [Address] [Instruction] [Data...] [CRC8]
  0xAA      0x55    1 byte    0x00      0x50/0x51   N bytes   1 byte
```

### Instructions
- **0x50** - Open Cabinet(s)
  - Data: [cabinet_id_1, cabinet_id_2, ...]
  - Response: ACK or NACK

- **0x51** - Request Status
  - Data: []
  - Response: 6 bytes status (one per cabinet)

### CRC8 Calculation
- Polynomial: 0x07
- Initial value: 0x00
- XOR output: Yes
- Covers: All bytes except header1, header2, and CRC itself

### Timing
- Delay between sends: 1000ms (hardware limitation - MUST be enforced)
- Response timeout: 2000ms
- Status polling interval: 5000ms (optional background polling)

## PROTOCOL ERROR HANDLING
1. **CRC Mismatch** → Discard frame, log warning, continue operation
2. **Timeout** → Mark operation as failed, return 500, log error, remain operational
3. **Buffer Overflow (>10KB)** → Clear buffer, log error
4. **Invalid Instruction** → Return 400 error to client
5. **Serial Port Disconnect** → Log error, return 503 for subsequent requests

## EDGE CASES

### 1. Serial Port Unavailable on Startup
**Scenario:** COM3 does not exist or is in use
**Expected:** Server starts successfully, logs warning, returns 503 on cabinet operations
**Test:** Set SERIAL_PORT=/dev/null, run server, call /api/v1/cabinet/open

### 2. Invalid Cabinet ID
**Scenario:** Client sends cabinetIds: [256]
**Expected:** 400 Bad Request
```json
{
  "status": "error",
  "message": "Cabinet ID 256 out of range (0-255)",
  "timestamp": "2025-01-14T12:00:00.000Z"
}
```
**Test:** POST /api/v1/cabinet/open with {"cabinetIds":[256]}

### 3. Serial Write Timeout
**Scenario:** Serial port write hangs >2s
**Expected:** Reject promise, return 500, log error, remain operational
**Test:** Mock serialPort.write() to never resolve

### 4. Concurrent Requests to Same Cabinet
**Scenario:** Two requests to open cabinet #5 arrive simultaneously
**Expected:** Queue operations, process sequentially with 1000ms delay, both succeed
**Test:** Fire two requests with 0ms delay

### 5. Malformed Response Frame
**Scenario:** Serial port returns garbage data (invalid CRC)
**Expected:** Discard frame, log warning with hex dump, continue operation
**Test:** Mock serial port to return random bytes

### 6. Response Buffer Overflow
**Scenario:** 100KB of data received without valid frame
**Expected:** Clear buffer after 10KB, log error with buffer size
**Test:** Mock serial port to send 20KB of 0xFF bytes

### 7. Empty Cabinet IDs Array
**Scenario:** Client sends cabinetIds: []
**Expected:** 400 Bad Request, message: "cabinetIds array cannot be empty"

### 8. Non-Array cabinetIds
**Scenario:** Client sends cabinetIds: "5"
**Expected:** 400 Bad Request, message: "cabinetIds must be an array"

## DELIVERABLES

### Source Files
- [ ] `src/server.js` (~120 lines)
  - Express app initialization
  - Middleware setup (JSON parsing, CORS if needed, request logging)
  - Route mounting at /api/v1
  - Server startup with serial connection attempt
  - Graceful shutdown handlers (SIGTERM, SIGINT)

- [ ] `src/routes/cabinetRoutes.js` (~50 lines)
  - GET /api/v1/health → getHealth()
  - GET /api/v1/cabinet/status → getStatus()
  - POST /api/v1/cabinet/open → openCabinets()
  - POST /api/v1/cabinet/reset → resetCabinet()

- [ ] `src/controllers/cabinetController.js` (~150 lines)
  - Input validation (manual or using Joi)
  - Response formatting (consistent JSON structure)
  - Error handling (400, 500, 503)
  - 4 controller functions matching routes

- [ ] `src/services/cabinetService.js` (~450 lines)
  - Singleton class CabinetService
  - connect() - Initialize serial port with error handling
  - openCabinets([ids]) - Send 0x50 frames with retry logic
  - requestStatus() - Send 0x51 frame
  - resetCabinet(id) - Send reset command
  - parseResponse(buffer) - Handle serial data with frame extraction
  - State management (cabinetStatus object)
  - sendFrameWithRetry() - Retry logic with exponential backoff (3 attempts)

- [ ] `src/utils/serialPort.js` (~120 lines)
  - calculateCRC8(buffer) - CRC calculation
  - buildSerialFrame(data, address, instruction) - Frame construction
  - validateFrame(buffer) - CRC verification
  - Helper utilities

- [ ] `src/utils/constants.js` (~50 lines) **NEW FILE**
  - PROTOCOL_CONSTANTS (headers, instructions, addresses)
  - TIMING_CONSTANTS (delays, timeouts)
  - FRAME_CONSTANTS (min length, buffer limits)
  - ERROR_MESSAGES (consistent error strings)

### Configuration
- [ ] `.env.example`
  ```env
  PORT=80
  SERIAL_PORT=COM3
  BAUD_RATE=9600
  NODE_ENV=production
  LOG_LEVEL=info
  MAX_BUFFER_SIZE=10240
  ```

- [ ] `package.json`
  - All dependencies with exact versions
  - Scripts: start, dev, test, lint
  - ESM type: "module"

### Tests (Basic - TestAgent will expand)
- [ ] `tests/unit/cabinetService.test.js` (~100 lines)
  - Mock SerialPort with vitest
  - Test connect(), openCabinets()
  - Test CRC calculation
  - Basic frame parsing

## ACCEPTANCE TESTS

### Test 1: Server Starts Successfully
```bash
npm install
npm start
# Expected: "Express server listening on port 80"
# Expected: "Serial port connection attempt: COM3"
```

### Test 2: Health Check
```bash
curl http://localhost:80/api/v1/health
# Expected: 200
# Body: {"status":"healthy","timestamp":"2025-01-14T...","uptime":123}
```

### Test 3: Open Cabinet (Serial Available)
```bash
curl -X POST http://localhost:80/api/v1/cabinet/open \
  -H "Content-Type: application/json" \
  -d '{"cabinetIds": [1, 2]}'
# Expected: 200
# Body: {"status":"success","data":{"opened":[1,2],"failed":[]},"timestamp":"..."}
```

### Test 4: Invalid Input Rejection
```bash
curl -X POST http://localhost:80/api/v1/cabinet/open \
  -H "Content-Type: application/json" \
  -d '{"cabinetIds": [256]}'
# Expected: 400
# Body: {"status":"error","message":"Cabinet ID 256 out of range (0-255)","timestamp":"..."}
```

### Test 5: Serial Port Unavailable
```bash
SERIAL_PORT=/dev/null npm start
curl -X POST http://localhost:80/api/v1/cabinet/open \
  -H "Content-Type: application/json" \
  -d '{"cabinetIds":[1]}'
# Expected: 503
# Body: {"status":"error","message":"Serial port not connected","timestamp":"..."}
```

### Test 6: Linting Passes
```bash
npm run lint
# Expected: 0 errors, 0 warnings
```

## CODE STYLE

### ✅ FOLLOW THESE PATTERNS

#### Use Named Constants
```javascript
// GOOD
import { PROTOCOL_CONSTANTS, TIMING_CONSTANTS } from '../utils/constants.js';

const frame = buildSerialFrame(
  [cabinetId],
  PROTOCOL_CONSTANTS.BOARD_ADDRESS,
  PROTOCOL_CONSTANTS.INSTRUCTION_OPEN
);

await this.delay(TIMING_CONSTANTS.DELAY_BETWEEN_SENDS);
```

#### Async/Await with Proper Error Handling
```javascript
// GOOD
async function openCabinets(ids) {
  try {
    const result = await cabinetService.openCabinets(ids);
    return {
      status: 'success',
      data: result,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    logger.error({ err, ids }, 'Failed to open cabinets');
    throw new Error(`Failed to open cabinets: ${err.message}`);
  }
}
```

#### Consistent Error Responses
```javascript
// GOOD
res.status(400).json({
  status: 'error',
  message: 'Cabinet ID out of range (0-255)',
  timestamp: new Date().toISOString()
});
```

#### Proper Logging (NOT console.log)
```javascript
// GOOD - Use structured logging or at minimum logger abstraction
import logger from '../utils/logger.js';
logger.info({ cabinetId, action: 'open' }, 'Opening cabinet');
logger.error({ err, context: 'serial_write' }, 'Serial write failed');

// ACCEPTABLE (if no logger library)
const logger = {
  info: (msg, data) => console.log(`[INFO] ${msg}`, data),
  error: (msg, data) => console.error(`[ERROR] ${msg}`, data),
  warn: (msg, data) => console.warn(`[WARN] ${msg}`, data)
};
```

#### Retry Logic with Exponential Backoff
```javascript
// GOOD
async sendFrameWithRetry(frame, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await this.sendFrame(frame);
    } catch (err) {
      if (attempt === maxRetries) throw err;

      const delayMs = Math.pow(2, attempt - 1) * 100; // 100ms, 200ms, 400ms
      logger.warn({ attempt, delayMs, err: err.message }, 'Frame send failed, retrying');

      await this.delay(delayMs);
    }
  }
}
```

### ❌ AVOID THESE PATTERNS

#### NO console.log in Production Code
```javascript
// BAD
console.log('hello world');
console.log(requestFresh);
```

#### NO Magic Numbers
```javascript
// BAD
if (frame[4] === 0x51) { ... }  // What is 0x51?
await delay(1000);               // Why 1000?
if (frame.length < 12) { ... }   // Why 12?
```

#### NO Callback Hell
```javascript
// BAD
port.write(data, function(err) {
  if (err) {
    callback(err);
  } else {
    callback(null, result);
  }
});
```

#### NO Inconsistent Naming
```javascript
// BAD
const getCabinetStatus = ...  // Mixing getCamel with camelCase
const cabinetOpen = ...
```

## PRODUCTION CHECKLIST
Before marking this task complete, verify:

- [ ] Remove ALL console.log debug statements
- [ ] Extract ALL magic numbers to constants.js
- [ ] Implement retry logic with exponential backoff (3 retries)
- [ ] Add buffer size limit (10KB max)
- [ ] Proper structured logging (logger abstraction minimum)
- [ ] Zero linting errors (`npm run lint` passes)
- [ ] All edge cases have error handlers
- [ ] Consistent response format across all endpoints
- [ ] Environment variables documented in .env.example
- [ ] Graceful shutdown handlers implemented

## HANDOFF

### Next Agent
TestAgent

### Artifacts to Provide
- All source files in src/
- package.json with dependencies
- .env.example with all variables
- Basic unit tests in tests/unit/
- **handoff.json** (create this file):

```json
{
  "from_agent": "BackendBuilder",
  "to_agent": "TestAgent",
  "timestamp": "YYYY-MM-DDTHH:mm:ssZ",
  "artifacts": [
    {
      "type": "source_file",
      "path": "src/services/cabinetService.js",
      "purpose": "Main serial port communication service",
      "exported_functions": ["connect", "openCabinets", "requestStatus", "resetCabinet"],
      "dependencies": ["serialport", "src/utils/serialPort.js", "src/utils/constants.js"],
      "test_priority": "high"
    },
    {
      "type": "source_file",
      "path": "src/controllers/cabinetController.js",
      "purpose": "HTTP request handlers and validation",
      "test_priority": "high"
    },
    {
      "type": "source_file",
      "path": "src/utils/serialPort.js",
      "purpose": "CRC8 calculation and frame building",
      "test_priority": "critical"
    },
    {
      "type": "config_file",
      "path": ".env.example",
      "purpose": "Environment configuration template",
      "variables": ["PORT", "SERIAL_PORT", "BAUD_RATE", "NODE_ENV"]
    }
  ],
  "context": {
    "design_decisions": [
      "Chose singleton pattern for single serial port connection",
      "1000ms delay between operations (hardware limitation)",
      "CRC8 validation on all frames",
      "Retry logic with 3 attempts and exponential backoff",
      "10KB buffer limit to prevent memory leaks",
      "Server continues running even if serial port unavailable"
    ],
    "known_limitations": [
      "Serial port communication not tested with real hardware",
      "No authentication implemented (v1 assumption: internal network)",
      "State stored in memory (not persistent)"
    ],
    "test_requirements": {
      "coverage": 90,
      "critical_paths": [
        "CRC8 calculation",
        "Frame parsing and validation",
        "Error handling on serial timeout",
        "Buffer overflow protection",
        "Concurrent request handling"
      ],
      "edge_cases_to_test": [
        "Serial port unavailable",
        "Invalid cabinet IDs (negative, >255, non-integer)",
        "Empty or non-array cabinetIds",
        "Concurrent requests to same cabinet",
        "Malformed serial responses",
        "Buffer overflow scenarios"
      ]
    }
  },
  "validation": {
    "command": "npm install && npm run lint && npm test",
    "expected_result": "All commands pass with 0 errors",
    "checklist": [
      "Code compiles without errors",
      "ESLint passes with zero errors and warnings",
      "All endpoints return proper status codes (200/400/500/503)",
      "NO console.log statements in production code",
      "All magic numbers extracted to constants"
    ]
  }
}
```

### Validation Command
```bash
npm install && npm run lint && npm test
```

### Expected Result
- All tests pass (0 failures)
- 90%+ coverage (basic, TestAgent will expand)
- Zero linting errors

### Known Issues to Communicate
- Serial port communication not tested with real hardware (needs manual verification)
- No load testing performed yet (TestAgent will add stress tests)
- No authentication implemented (v1 design decision for internal network)

## REFERENCES
- Express.js Best Practices: https://expressjs.com/en/advanced/best-practice-security.html
- SerialPort Documentation: https://serialport.io/docs/
- CRC Calculation Guide: https://crccalc.com/
- Node.js Error Handling: https://nodejs.org/api/errors.html

## PERFORMANCE REQUIREMENTS
- API response (non-serial): <50ms at p95
- Serial operation: <2s total (including retries)
- Support 100 req/min sustained load
- Memory usage: <100MB resident
- No memory leaks (buffer properly limited)

## QUALITY METRICS TARGET
- Code coverage: >90%
- Cyclomatic complexity: <10 per function
- Max function length: 50 lines
- Linting errors: 0
- Production console.log: 0
- Magic numbers: 0
