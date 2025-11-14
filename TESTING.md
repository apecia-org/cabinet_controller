# Cabinet Control API - Testing Guide

This document describes the comprehensive test suite for the Cabinet Control REST API service.

## Overview

The test suite includes three types of tests:

1. **Unit Tests** - Test individual components in isolation with mocked dependencies
2. **Integration Tests** - Test API endpoints and their interactions
3. **Manual Tests** - Browser-friendly test script for validation and debugging

## Test Structure

```
tests/
├── unit/
│   └── cabinetService.test.js       # Unit tests for CabinetService
├── integration/
│   └── api.test.js                  # Integration tests for API endpoints
└── manual/
    └── test-api.js                  # Manual testing script
```

## Setup and Installation

### 1. Install Dependencies

```bash
npm install
```

This will install the following dev dependencies:
- **vitest** - Modern unit test framework (Jest-compatible)
- **supertest** - HTTP assertion library for testing Express apps

### 2. Environment Configuration

Tests use default configuration. For custom settings, create a `.env.test` file:

```bash
# .env.test
NODE_ENV=test
API_HOST=localhost
API_PORT=80
```

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

Automatically reruns tests when files change. Great for development.

### Run Unit Tests Only

```bash
npm run test:unit
```

Tests the `CabinetService` with mocked serial port communication.

### Run Integration Tests Only

```bash
npm run test:integration
```

Tests all API endpoints with a test Express app.

### Generate Coverage Report

```bash
npm run test:coverage
```

Generates coverage reports in HTML format (check `coverage/index.html`).

### Run Manual Tests

```bash
npm run test:manual
```

Or directly with Node:

```bash
node tests/manual/test-api.js
```

This script:
- Validates all API endpoints
- Tests valid and invalid inputs
- Verifies error handling
- Shows colored output with pass/fail results
- **Requires the API server to be running** (`npm start` in another terminal)

## Unit Tests (`tests/unit/cabinetService.test.js`)

### What They Test

Tests the `CabinetService` class with mocked `SerialPort` to avoid hardware dependencies.

### Test Coverage

#### Connection Management
- Initialize with default configuration
- Connect to serial port successfully
- Disconnect from serial port
- Handle disconnect when not connected

#### Cabinet Opening
- Open single cabinet
- Open multiple cabinets
- Update cabinet status tracking
- Reject empty cabinet ID arrays
- Reject non-array input
- Reject null input
- Reject negative cabinet IDs
- Reject cabinet IDs > 255
- Reject non-integer values
- Reject non-number values in array
- Accept boundary values (0 and 255)
- Include timestamps in results
- Send frame for each cabinet ID

#### Status Tracking
- Return correct status object structure
- Return empty cabinets array initially
- Include opened cabinets in status
- Reflect connected status
- Include port configuration in status

#### Reset Functionality
- Clear all cabinet status data
- Handle reset when no data exists
- Allow reopening after reset

#### Response Parsing
- Ignore short buffers
- Clear invalid header data
- Recognize valid frame headers
- Handle incomplete frames

#### Utility Functions
- Delay function works correctly
- Delay returns a Promise

#### End-to-End Workflows
- Complete workflow: connect -> open -> status -> reset -> disconnect

### Running Unit Tests

```bash
npm run test:unit
```

Example output:
```
✓ CabinetService Unit Tests (45 tests)
  ✓ Serial Port Connection (4 tests)
  ✓ openCabinets() (12 tests)
  ✓ getCabinetStatus() (5 tests)
  ✓ resetStatus() (3 tests)
  ✓ parseResponse() (4 tests)
  ✓ delay() (2 tests)
  ✓ End-to-End Service Flow (1 test)
```

## Integration Tests (`tests/integration/api.test.js`)

### What They Test

Tests all API endpoints with a test Express application and mocked serial port.

### Test Coverage

#### Root Endpoint
- Service information retrieval
- Endpoint documentation

#### Health Check Endpoint (`GET /api/v1/health`)
- Returns 200 status
- Includes required fields (status, timestamp, service, version)
- Returns valid ISO 8601 timestamp
- Includes correct service name
- Returns JSON content-type

#### Cabinet Status Endpoint (`GET /api/v1/cabinet/status`)
- Returns 200 status with success status
- Includes required fields (status, data, timestamp)
- Returns cabinet data with connection info
- Cabinets field is array
- Returns empty cabinets array initially
- Includes timestamp

#### Open Cabinets Endpoint - Valid Requests
- Open single cabinet successfully
- Open multiple cabinets
- Return proper response structure
- Include timestamps in cabinet data
- Accept valid boundary values (0, 255)
- Handle multiple sequential opens
- Return JSON content-type

#### Open Cabinets Endpoint - Invalid Requests (Input Validation)
- Reject missing cabinetIds field
- Reject non-array cabinetIds
- Reject empty cabinetIds array
- Reject object instead of array
- Reject negative cabinet IDs
- Reject cabinet IDs > 255
- Reject non-integer values
- Reject string values in array

#### Reset Endpoint (`POST /api/v1/cabinet/reset`)
- Reset successfully (200 status)
- Include reset message
- Return timestamp
- Clear cabinet status data
- Allow reopening after reset
- Return JSON content-type

#### Error Handling
- Return 404 for unknown routes
- Return 404 for wrong HTTP method
- Return 404 for GET on POST endpoint
- Handle invalid JSON in request body
- Return error with detailed message

#### End-to-End Workflows
- Complete workflow: health -> status -> open -> reset
- Multiple sequential open operations

### Running Integration Tests

```bash
npm run test:integration
```

Example output:
```
✓ Cabinet Control REST API Integration Tests (80+ tests)
  ✓ GET / (2 tests)
  ✓ GET /api/v1/health (5 tests)
  ✓ GET /api/v1/cabinet/status (6 tests)
  ✓ POST /api/v1/cabinet/open (20+ tests)
  ✓ POST /api/v1/cabinet/reset (7 tests)
  ✓ Error Handling (5 tests)
  ✓ End-to-End API Workflows (2 tests)
```

## Manual Tests (`tests/manual/test-api.js`)

### Purpose

The manual test script provides a comprehensive, colored CLI interface to test all API endpoints without a test framework. It's useful for:

- Quick validation of a running API
- Debugging API behavior
- Demoing API functionality
- CI/CD pipeline integration

### Features

- Colored output for easy reading
- Detailed test results with status codes
- Automatic retry logic for connection establishment
- Test summary with pass rate
- Exit codes for CI/CD integration (0 = success, 1 = failure)

### Running Manual Tests

First, start the API server:

```bash
npm start
```

In another terminal, run the manual tests:

```bash
npm run test:manual
```

### Manual Test Coverage

Tests organized by endpoint:

1. **Root Endpoint** - API documentation retrieval
2. **Health Check** - Service health status
3. **Cabinet Status** - Current cabinet status
4. **Open Cabinets - Valid Requests**
   - Single cabinet
   - Multiple cabinets
   - Boundary values (0, 255)
5. **Open Cabinets - Invalid Requests**
   - Missing field
   - Empty array
   - Non-array input
   - Negative values
   - Values > 255
   - Floating point values
   - String values in array
6. **Reset Status** - Status reset and clearing
7. **Error Handling** - 404s and bad requests
8. **Content Type** - JSON response validation

### Sample Output

```
Cabinet Control API - Manual Test Suite
Testing API at: http://localhost:80

======================================================================
ROOT ENDPOINT TESTS
======================================================================

► GET / - Get API Documentation
  ✓ Root endpoint returns 200
  ✓ Response contains service information
  ✓ Response includes endpoints object

======================================================================
HEALTH CHECK ENDPOINT
======================================================================

► GET /api/v1/health - Health Check
  ✓ Health endpoint returns 200
  ✓ Health status is "healthy"
  ✓ Service name is correct
  ✓ Response includes valid timestamp
  ✓ Has JSON content-type

======================================================================
TEST SUMMARY
======================================================================

Test Results:
  Passed: 127
  Failed: 0
  Total:  127

Pass Rate: 100.0%

All tests passed!
```

## Test Best Practices

### Isolation

All tests are isolated from external dependencies:

- **Serial Port**: Mocked in unit and integration tests
- **Database**: Not applicable (service is stateless per request)
- **External APIs**: Not used in this service

### Atomicity

Each test:
- Tests only one behavior or assertion path
- Is independent and can run in any order
- Includes setup (`beforeEach`) and cleanup (`afterEach`)
- Doesn't depend on other test results

### Readability

Tests follow the AAA pattern (Arrange-Act-Assert):

```javascript
it('should do something specific', async () => {
  // Arrange - Set up test data
  const input = [1, 2, 3];

  // Act - Perform the action
  const result = await service.someMethod(input);

  // Assert - Verify the result
  expect(result).toBe(expected);
});
```

### Coverage

Aim for high coverage of critical paths:

- Happy paths (normal operation)
- Edge cases (boundary values, empty inputs)
- Error cases (invalid inputs, exceptions)

Current coverage targets:
- **Critical functions**: >95%
- **Overall**: >80%

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
```

### GitLab CI Example

```yaml
test:
  image: node:18
  script:
    - npm install
    - npm test
```

## Troubleshooting

### Tests Fail with "Cannot find module"

Solution: Install dependencies
```bash
npm install
```

### Manual tests can't connect to API

Solution: Start the API server first
```bash
npm start
```

### Serial port errors in tests

This is expected in test environments. Tests use mocked SerialPort, so no real hardware is needed.

### Coverage report not generated

Solution: Install coverage provider
```bash
npm install --save-dev @vitest/coverage-v8
```

## Performance

- **Unit tests**: ~2-3 seconds
- **Integration tests**: ~3-5 seconds
- **Manual tests**: ~10-20 seconds (depends on network)
- **Total**: ~30 seconds for full test suite

Tests are optimized to run quickly and can be included in pre-commit hooks.

## Contributing

When adding new features:

1. Write unit tests for service methods
2. Write integration tests for API endpoints
3. Update manual tests if adding new endpoints
4. Ensure all tests pass: `npm test`
5. Check coverage: `npm run test:coverage`

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Express.js Testing Guide](https://expressjs.com/en/guide/testing.html)

## Support

For issues or questions about the test suite, refer to the inline documentation in the test files or consult the framework documentation.
