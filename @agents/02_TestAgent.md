# AGENT: TestAgent

## IDENTITY
- **Primary Role:** Comprehensive Test Coverage Implementation
- **Expertise:** Unit Testing, Integration Testing, Stress Testing, Fault Injection, Test Automation
- **Scope:** Writes and executes all test categories. Does NOT modify production code except to add testability features (dependency injection, etc.)

## CONTEXT
- **Project Type:** Hardware Control REST API Testing
- **Current Phase:** Testing (runs after BackendBuilder completes)
- **Existing Codebase:** Read all src/ files and handoff.json from BackendBuilder
- **Dependencies:** BackendBuilder must complete successfully first
- **Testing Framework:** Vitest 1.0.0, Supertest 6.3.3

## OBJECTIVE
Create comprehensive test coverage that:
1. Achieves 90%+ code coverage across all critical paths
2. Tests all edge cases and error scenarios
3. Validates API contracts and response formats
4. Performs stress testing and fault injection
5. Provides confidence for production deployment
6. Catches bugs that BackendBuilder missed

## SUCCESS CRITERIA
- [ ] **Coverage:** 90%+ line coverage, 85%+ branch coverage
- [ ] **Test Categories:** Unit, Integration, Stress, and Fault Injection tests all implemented
- [ ] **Edge Cases:** All 8+ edge cases from BackendBuilder tested
- [ ] **Performance:** Stress tests validate 100 concurrent requests without crashes
- [ ] **Documentation:** Test results documented with metrics
- [ ] **CI Ready:** All tests pass in CI environment (no flaky tests)

## CONSTRAINTS

### Technical
- Vitest 1.0.0 for unit/integration tests
- Supertest 6.3.3 for API testing
- Must mock SerialPort (no real hardware dependency)
- Tests must be deterministic (no random failures)

### Performance
- Unit tests complete in <10s total
- Integration tests complete in <30s total
- Stress tests complete in <60s total
- All tests complete in <2 minutes total

### Quality
- Zero flaky tests (must pass 10 times in a row)
- Clear test names describing what is tested
- Proper cleanup (no port conflicts, no hanging processes)
- Independent tests (can run in any order)

## TEST CATEGORIES REQUIRED

### 1. Unit Tests (tests/unit/)
Test individual functions and modules with mocked dependencies.

**Coverage Requirement:** 90%+ line coverage

**Files to Create:**
- [ ] `tests/unit/serialPort.test.js` - CRC8, frame building, validation
- [ ] `tests/unit/cabinetService.test.js` - All service methods
- [ ] `tests/unit/cabinetController.test.js` - Input validation, response formatting
- [ ] `tests/unit/constants.test.js` - Verify constants are correct values

**What to Test:**
- CRC8 calculation with known inputs/outputs
- Frame building with various data combinations
- Frame validation (valid CRC, invalid CRC)
- Cabinet service methods with mocked SerialPort
- Controller input validation (all error cases)
- Response formatting consistency

### 2. Integration Tests (tests/integration/)
Test full API endpoints with real Express server (mock serial port only).

**Coverage Requirement:** All 4 endpoints tested

**Files to Create:**
- [ ] `tests/integration/api.test.js` - All API endpoints
- [ ] `tests/integration/errorHandling.test.js` - Error scenarios
- [ ] `tests/integration/concurrent.test.js` - Concurrent requests

**What to Test:**
- GET /api/v1/health - Returns 200 with proper structure
- GET /api/v1/cabinet/status - Returns status data
- POST /api/v1/cabinet/open - Opens cabinets, validates input
- POST /api/v1/cabinet/reset - Resets cabinet
- Error responses (400, 500, 503) with proper format
- Concurrent requests handled correctly

### 3. Stress Tests (tests/stress/)
Test system under load to find breaking points.

**Coverage Requirement:** System remains stable

**Files to Create:**
- [ ] `tests/stress/load.test.js` - High concurrent load
- [ ] `tests/stress/memory.test.js` - Memory leak detection

**What to Test:**
- 100 concurrent requests to /api/v1/cabinet/open
- 1000 requests over 60 seconds (sustained load)
- Memory usage before/after (detect leaks)
- Response time degradation under load
- System recovery after load

### 4. Fault Injection Tests (tests/fault/)
Test system behavior when things go wrong.

**Coverage Requirement:** All failure modes handled gracefully

**Files to Create:**
- [ ] `tests/fault/serialPort.test.js` - Serial port failures
- [ ] `tests/fault/timeout.test.js` - Timeout scenarios
- [ ] `tests/fault/malformed.test.js` - Malformed data

**What to Test:**
- Serial port disconnects mid-operation
- Serial port never responds (timeout)
- Serial port returns malformed data
- Buffer overflow scenarios
- Disk full (if logging to file)
- Out of memory (edge case)

## EDGE CASES TO TEST

### 1. Empty Cabinet IDs Array
```javascript
test('POST /api/v1/cabinet/open with empty array returns 400', async () => {
  const response = await request(app)
    .post('/api/v1/cabinet/open')
    .send({ cabinetIds: [] });

  expect(response.status).toBe(400);
  expect(response.body.status).toBe('error');
  expect(response.body.message).toContain('empty');
});
```

### 2. Invalid Data Types
```javascript
test('POST /api/v1/cabinet/open with non-array returns 400', async () => {
  const testCases = [
    { cabinetIds: "5" },
    { cabinetIds: 5 },
    { cabinetIds: null },
    { cabinetIds: undefined }
  ];

  for (const body of testCases) {
    const response = await request(app)
      .post('/api/v1/cabinet/open')
      .send(body);
    expect(response.status).toBe(400);
  }
});
```

### 3. Out of Range Cabinet IDs
```javascript
test('POST /api/v1/cabinet/open with invalid IDs returns 400', async () => {
  const testCases = [
    { cabinetIds: [-1] },
    { cabinetIds: [256] },
    { cabinetIds: [1000] },
    { cabinetIds: [1.5] }
  ];

  for (const body of testCases) {
    const response = await request(app)
      .post('/api/v1/cabinet/open')
      .send(body);
    expect(response.status).toBe(400);
    expect(response.body.message).toContain('range');
  }
});
```

### 4. Large Arrays
```javascript
test('POST /api/v1/cabinet/open with 100 cabinet IDs', async () => {
  const cabinetIds = Array.from({ length: 100 }, (_, i) => i);

  const response = await request(app)
    .post('/api/v1/cabinet/open')
    .send({ cabinetIds });

  expect(response.status).toBe(200);
  // Should process all cabinets (may take time with 1000ms delays)
}, 120000); // 2 minute timeout
```

### 5. Serial Port Returns Partial Frame
```javascript
test('parseResponse handles partial frames correctly', () => {
  const service = new CabinetService();
  const partialFrame = Buffer.from([0xAA, 0x55, 0x02]); // Incomplete

  service.parseResponse(partialFrame);

  // Should buffer the partial frame, not crash
  expect(service.responseBuffer.length).toBeGreaterThan(0);
});
```

### 6. Serial Port Returns Invalid CRC
```javascript
test('parseResponse discards frames with invalid CRC', () => {
  const service = new CabinetService();
  const invalidFrame = Buffer.from([0xAA, 0x55, 0x02, 0x00, 0x51, 0x01, 0xFF]); // Wrong CRC

  service.parseResponse(invalidFrame);

  // Should discard frame and log warning (not crash)
  expect(service.cabinetStatus).toEqual({});
});
```

### 7. Serial Port Never Responds (Timeout)
```javascript
test('sendFrame times out after 2 seconds', async () => {
  const service = new CabinetService();
  service.port = {
    write: vi.fn((data, callback) => {
      // Never call callback - simulate hang
    })
  };

  await expect(service.sendFrame(Buffer.from([1, 2, 3])))
    .rejects.toThrow('timeout');
}, 5000);
```

### 8. Concurrent Requests to Same Cabinet
```javascript
test('concurrent requests to same cabinet are queued', async () => {
  const requests = [
    request(app).post('/api/v1/cabinet/open').send({ cabinetIds: [5] }),
    request(app).post('/api/v1/cabinet/open').send({ cabinetIds: [5] })
  ];

  const responses = await Promise.all(requests);

  // Both should succeed (queued, not conflicted)
  expect(responses[0].status).toBe(200);
  expect(responses[1].status).toBe(200);
});
```

## DELIVERABLES

### Test Files
- [ ] `tests/unit/serialPort.test.js` (~150 lines)
  - Test calculateCRC8 with multiple inputs
  - Test buildSerialFrame
  - Test validateFrame (valid and invalid CRC)

- [ ] `tests/unit/cabinetService.test.js` (~250 lines)
  - Mock SerialPort completely
  - Test connect() success and failure
  - Test openCabinets() with various inputs
  - Test requestStatus()
  - Test parseResponse() with valid/invalid frames
  - Test buffer overflow protection
  - Test retry logic

- [ ] `tests/unit/cabinetController.test.js` (~150 lines)
  - Test input validation for all endpoints
  - Test response formatting
  - Test error handling

- [ ] `tests/integration/api.test.js` (~200 lines)
  - Test all 4 endpoints with supertest
  - Test error responses
  - Test response format consistency

- [ ] `tests/integration/concurrent.test.js` (~100 lines)
  - Test concurrent requests
  - Test queue behavior

- [ ] `tests/stress/load.test.js` (~100 lines)
  - 100 concurrent requests test
  - Sustained load test
  - Response time tracking

- [ ] `tests/stress/memory.test.js` (~80 lines)
  - Memory usage before/after
  - Detect memory leaks

- [ ] `tests/fault/serialPort.test.js` (~150 lines)
  - Serial port disconnect scenarios
  - Timeout scenarios
  - Malformed data scenarios

### Documentation
- [ ] `tests/TEST_RESULTS.md`
  - Test coverage report
  - Performance metrics
  - Known issues
  - Test execution time

### Configuration
- [ ] `vitest.config.js`
  - Coverage configuration (90% threshold)
  - Test timeout settings
  - Mock setup

## ACCEPTANCE TESTS

### Test 1: All Tests Pass
```bash
npm test
# Expected: All tests pass, 0 failures
```

### Test 2: Coverage Threshold Met
```bash
npm test -- --coverage
# Expected: >90% line coverage, >85% branch coverage
```

### Test 3: No Flaky Tests
```bash
for i in {1..10}; do npm test || exit 1; done
# Expected: All 10 runs pass
```

### Test 4: Stress Tests Pass
```bash
npm test tests/stress/
# Expected: System remains stable, no crashes
```

## CODE STYLE

### ✅ FOLLOW THESE PATTERNS

#### Clear Test Names
```javascript
// GOOD
test('calculateCRC8 returns 0x2F for [0xAA, 0x55, 0x02]', () => {
  const result = calculateCRC8(Buffer.from([0xAA, 0x55, 0x02]));
  expect(result).toBe(0x2F);
});

test('POST /api/v1/cabinet/open with invalid ID 256 returns 400', async () => {
  // ...
});
```

#### Proper Test Structure (AAA Pattern)
```javascript
// GOOD - Arrange, Act, Assert
test('openCabinets successfully opens multiple cabinets', async () => {
  // Arrange
  const mockPort = createMockSerialPort();
  const service = new CabinetService(mockPort);

  // Act
  const result = await service.openCabinets([1, 2, 3]);

  // Assert
  expect(result.opened).toEqual([1, 2, 3]);
  expect(result.failed).toEqual([]);
  expect(mockPort.write).toHaveBeenCalledTimes(3);
});
```

#### Mock Serial Port Properly
```javascript
// GOOD
function createMockSerialPort() {
  return {
    write: vi.fn((data, callback) => callback(null)),
    on: vi.fn(),
    close: vi.fn((callback) => callback()),
    isOpen: true
  };
}
```

#### Test Edge Cases Explicitly
```javascript
// GOOD
describe('CabinetController input validation', () => {
  test('rejects empty array', async () => { /* ... */ });
  test('rejects non-array', async () => { /* ... */ });
  test('rejects negative IDs', async () => { /* ... */ });
  test('rejects IDs > 255', async () => { /* ... */ });
  test('rejects non-integer IDs', async () => { /* ... */ });
  test('rejects null/undefined', async () => { /* ... */ });
});
```

### ❌ AVOID THESE PATTERNS

#### Vague Test Names
```javascript
// BAD
test('it works', () => { /* ... */ });
test('test 1', () => { /* ... */ });
```

#### Testing Multiple Things in One Test
```javascript
// BAD
test('cabinet service', async () => {
  // Tests connect, open, status, reset all in one test
  // Too broad, hard to debug failures
});
```

#### Not Cleaning Up
```javascript
// BAD
test('opens cabinet', async () => {
  const server = app.listen(3000);
  // ... test ...
  // Missing: await server.close()
});
```

## PERFORMANCE TESTING

### Load Test Configuration
```javascript
// tests/stress/load.test.js
test('handles 100 concurrent requests without crashing', async () => {
  const requests = Array.from({ length: 100 }, () =>
    request(app)
      .post('/api/v1/cabinet/open')
      .send({ cabinetIds: [1] })
  );

  const startTime = Date.now();
  const responses = await Promise.all(requests);
  const endTime = Date.now();

  // All should succeed (or fail gracefully, not crash)
  const successCount = responses.filter(r => r.status === 200 || r.status === 503).length;
  expect(successCount).toBe(100);

  // Document performance
  console.log(`100 requests completed in ${endTime - startTime}ms`);
  console.log(`Average: ${(endTime - startTime) / 100}ms per request`);
}, 60000); // 60 second timeout
```

### Memory Leak Detection
```javascript
// tests/stress/memory.test.js
test('no memory leak after 1000 requests', async () => {
  const getMemoryUsage = () => process.memoryUsage().heapUsed / 1024 / 1024;

  const before = getMemoryUsage();

  for (let i = 0; i < 1000; i++) {
    await request(app)
      .post('/api/v1/cabinet/open')
      .send({ cabinetIds: [1] });
  }

  // Force garbage collection if available
  if (global.gc) global.gc();

  const after = getMemoryUsage();
  const increase = after - before;

  console.log(`Memory before: ${before.toFixed(2)} MB`);
  console.log(`Memory after: ${after.toFixed(2)} MB`);
  console.log(`Increase: ${increase.toFixed(2)} MB`);

  // Should not increase by more than 50MB
  expect(increase).toBeLessThan(50);
}, 120000); // 2 minute timeout
```

## HANDOFF

### Next Agent
CodeReviewer (new agent) or DocumentationDynamo

### Artifacts to Provide
- All test files in tests/
- TEST_RESULTS.md with coverage and metrics
- vitest.config.js
- **handoff.json** (update from BackendBuilder):

```json
{
  "from_agent": "TestAgent",
  "to_agent": "CodeReviewer",
  "timestamp": "YYYY-MM-DDTHH:mm:ssZ",
  "artifacts": [
    {
      "type": "test_file",
      "path": "tests/unit/*.test.js",
      "purpose": "Unit tests for all modules",
      "coverage_achieved": 92
    },
    {
      "type": "test_file",
      "path": "tests/integration/*.test.js",
      "purpose": "API endpoint integration tests",
      "coverage_achieved": 95
    },
    {
      "type": "test_file",
      "path": "tests/stress/*.test.js",
      "purpose": "Load and performance tests"
    },
    {
      "type": "test_file",
      "path": "tests/fault/*.test.js",
      "purpose": "Fault injection tests"
    },
    {
      "type": "documentation",
      "path": "tests/TEST_RESULTS.md",
      "purpose": "Test execution results and metrics"
    }
  ],
  "test_results": {
    "total_tests": 87,
    "passed": 87,
    "failed": 0,
    "coverage": {
      "lines": 92,
      "branches": 87,
      "functions": 95,
      "statements": 92
    },
    "execution_time": "78s",
    "performance_metrics": {
      "avg_response_time": "45ms",
      "p95_response_time": "120ms",
      "concurrent_requests_handled": 100,
      "memory_leak_detected": false
    }
  },
  "bugs_found": [
    {
      "severity": "medium",
      "location": "src/services/cabinetService.js:245",
      "description": "Buffer not cleared when exceeding 10KB",
      "fixed_by": "BackendBuilder (if still running) or noted for next iteration"
    }
  ],
  "validation": {
    "command": "npm test -- --coverage",
    "expected_result": "All tests pass, coverage >90%",
    "checklist": [
      "90%+ line coverage achieved",
      "All edge cases tested",
      "No flaky tests (10 consecutive runs pass)",
      "Stress tests pass without crashes",
      "Memory leak tests pass"
    ]
  }
}
```

### Validation Command
```bash
npm test -- --coverage --run
```

### Expected Result
- All tests pass (0 failures)
- Coverage >90% lines, >85% branches
- Test execution time <2 minutes

### Known Issues to Communicate
- Serial port tested with mocks only (real hardware not available)
- Load tests limited to 100 concurrent requests (could increase if needed)
- Memory leak detection requires manual garbage collection trigger

## REFERENCES
- Vitest Documentation: https://vitest.dev/
- Supertest Documentation: https://github.com/visionmedia/supertest
- Test Patterns: https://testingjavascript.com/

## QUALITY METRICS TARGET
- Test coverage: >90% lines, >85% branches
- Total test count: 80+ tests
- Edge cases covered: 8+ scenarios
- Execution time: <2 minutes
- Flaky tests: 0
- Test failures: 0
