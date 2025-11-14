#!/usr/bin/env node

/**
 * Manual API Testing Script
 * Run with: node tests/manual/test-api.js
 *
 * This script tests all Cabinet Control API endpoints manually
 * and provides detailed output for debugging and validation.
 */

import http from 'http';
import { spawn } from 'child_process';

const API_HOST = process.env.API_HOST || 'localhost';
const API_PORT = process.env.API_PORT || 80;
const BASE_URL = `http://${API_HOST}:${API_PORT}`;

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Test result tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const testResults = [];

/**
 * Make HTTP request
 */
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Cabinet-API-Test-Script/1.0'
      }
    };

    const req = http.request(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const responseBody = data ? JSON.parse(data) : null;
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: responseBody,
            rawBody: data
          });
        } catch (err) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: null,
            rawBody: data,
            error: 'Invalid JSON in response'
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

/**
 * Log test title
 */
function logTestTitle(title) {
  console.log(`\n${colors.cyan}${colors.bright}► ${title}${colors.reset}`);
}

/**
 * Log test result
 */
function logTestResult(passed, message, details = null) {
  totalTests++;
  const icon = passed ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
  console.log(`  ${icon} ${message}`);

  if (details) {
    console.log(`    ${colors.yellow}${details}${colors.reset}`);
  }

  if (passed) {
    passedTests++;
    testResults.push({ status: 'PASS', message });
  } else {
    failedTests++;
    testResults.push({ status: 'FAIL', message });
  }
}

/**
 * Print section header
 */
function printSectionHeader(title) {
  console.log(`\n${colors.bright}${colors.blue}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}${title}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}${'='.repeat(70)}${colors.reset}`);
}

/**
 * Validate response structure
 */
function validateResponseStructure(response, expectedStatus, expectedFields = []) {
  const statusMatch = response.status === expectedStatus;
  const fieldMatch = expectedFields.every(field => field in response.body);
  return statusMatch && fieldMatch;
}

/**
 * Run all tests
 */
async function runTests() {
  console.clear();
  console.log(`${colors.bright}${colors.cyan}Cabinet Control API - Manual Test Suite${colors.reset}`);
  console.log(`${colors.yellow}Testing API at: ${BASE_URL}${colors.reset}\n`);

  try {
    // ==================== ROOT ENDPOINT ====================
    printSectionHeader('ROOT ENDPOINT TESTS');

    logTestTitle('GET / - Get API Documentation');
    try {
      const response = await makeRequest('GET', '/');
      logTestResult(
        response.status === 200,
        'Root endpoint returns 200',
        `Status: ${response.status}`
      );
      logTestResult(
        response.body && response.body.service === 'Cabinet Control API',
        'Response contains service information',
        `Service: ${response.body?.service}`
      );
      logTestResult(
        response.body && 'endpoints' in response.body,
        'Response includes endpoints object',
        `Endpoints: ${Object.keys(response.body?.endpoints || {}).join(', ')}`
      );
    } catch (err) {
      logTestResult(false, 'Root endpoint request failed', err.message);
    }

    // ==================== HEALTH ENDPOINT ====================
    printSectionHeader('HEALTH CHECK ENDPOINT');

    logTestTitle('GET /api/v1/health - Health Check');
    try {
      const response = await makeRequest('GET', '/api/v1/health');
      logTestResult(
        response.status === 200,
        'Health endpoint returns 200',
        `Status: ${response.status}`
      );
      logTestResult(
        response.body && response.body.status === 'healthy',
        'Health status is "healthy"',
        `Status: ${response.body?.status}`
      );
      logTestResult(
        response.body && response.body.service === 'cabinet-api',
        'Service name is correct',
        `Service: ${response.body?.service}`
      );
      logTestResult(
        response.body && 'timestamp' in response.body && response.body.timestamp,
        'Response includes valid timestamp',
        `Timestamp: ${response.body?.timestamp}`
      );
    } catch (err) {
      logTestResult(false, 'Health endpoint request failed', err.message);
    }

    // ==================== CABINET STATUS ENDPOINT ====================
    printSectionHeader('CABINET STATUS ENDPOINT');

    logTestTitle('GET /api/v1/cabinet/status - Get Cabinet Status');
    let statusResponse;
    try {
      statusResponse = await makeRequest('GET', '/api/v1/cabinet/status');
      logTestResult(
        statusResponse.status === 200,
        'Status endpoint returns 200',
        `Status: ${statusResponse.status}`
      );
      logTestResult(
        statusResponse.body && statusResponse.body.status === 'success',
        'Response status is "success"',
        `Status: ${statusResponse.body?.status}`
      );
      logTestResult(
        statusResponse.body && 'data' in statusResponse.body,
        'Response includes data object',
        `Data fields: ${Object.keys(statusResponse.body?.data || {}).join(', ')}`
      );
      logTestResult(
        statusResponse.body?.data && Array.isArray(statusResponse.body.data.cabinets),
        'Cabinets field is an array',
        `Cabinet count: ${statusResponse.body?.data?.cabinets?.length || 0}`
      );
      logTestResult(
        statusResponse.body?.data && 'connected' in statusResponse.body.data,
        'Status includes connection state',
        `Connected: ${statusResponse.body?.data?.connected}`
      );
    } catch (err) {
      logTestResult(false, 'Status endpoint request failed', err.message);
    }

    // ==================== OPEN CABINETS ENDPOINT - VALID REQUESTS ====================
    printSectionHeader('OPEN CABINETS ENDPOINT - VALID REQUESTS');

    logTestTitle('POST /api/v1/cabinet/open - Open Single Cabinet');
    try {
      const response = await makeRequest('POST', '/api/v1/cabinet/open', {
        cabinetIds: [1]
      });
      logTestResult(
        response.status === 200,
        'Open endpoint returns 200',
        `Status: ${response.status}`
      );
      logTestResult(
        response.body && response.body.status === 'success',
        'Response status is "success"',
        `Status: ${response.body?.status}`
      );
      logTestResult(
        response.body?.data && response.body.data.successCount === 1,
        'Successfully opened 1 cabinet',
        `Success count: ${response.body?.data?.successCount}`
      );
      logTestResult(
        response.body?.data?.opened?.length === 1,
        'Opened array contains 1 item',
        `Opened: ${response.body?.data?.opened?.length}`
      );
    } catch (err) {
      logTestResult(false, 'Single cabinet open request failed', err.message);
    }

    logTestTitle('POST /api/v1/cabinet/open - Open Multiple Cabinets');
    try {
      const response = await makeRequest('POST', '/api/v1/cabinet/open', {
        cabinetIds: [2, 3, 4]
      });
      logTestResult(
        response.status === 200,
        'Open endpoint returns 200',
        `Status: ${response.status}`
      );
      logTestResult(
        response.body?.data?.successCount === 3,
        'Successfully opened 3 cabinets',
        `Success count: ${response.body?.data?.successCount}`
      );
      logTestResult(
        response.body?.data?.opened?.length === 3,
        'Opened array contains 3 items',
        `Items: ${response.body?.data?.opened?.length}`
      );
    } catch (err) {
      logTestResult(false, 'Multiple cabinets open request failed', err.message);
    }

    logTestTitle('POST /api/v1/cabinet/open - Boundary Values (0 and 255)');
    try {
      const response = await makeRequest('POST', '/api/v1/cabinet/open', {
        cabinetIds: [0, 255]
      });
      logTestResult(
        response.status === 200,
        'Boundary value request returns 200',
        `Status: ${response.status}`
      );
      logTestResult(
        response.body?.data?.successCount === 2,
        'Boundary values accepted',
        `Success count: ${response.body?.data?.successCount}`
      );
    } catch (err) {
      logTestResult(false, 'Boundary values request failed', err.message);
    }

    // ==================== OPEN CABINETS ENDPOINT - INVALID REQUESTS ====================
    printSectionHeader('OPEN CABINETS ENDPOINT - INVALID REQUESTS');

    logTestTitle('POST /api/v1/cabinet/open - Missing cabinetIds Field');
    try {
      const response = await makeRequest('POST', '/api/v1/cabinet/open', {});
      logTestResult(
        response.status === 400,
        'Returns 400 for missing field',
        `Status: ${response.status}`
      );
      logTestResult(
        response.body?.status === 'error',
        'Response status is "error"',
        `Error: ${response.body?.message}`
      );
    } catch (err) {
      logTestResult(false, 'Missing field test failed', err.message);
    }

    logTestTitle('POST /api/v1/cabinet/open - Empty cabinetIds Array');
    try {
      const response = await makeRequest('POST', '/api/v1/cabinet/open', {
        cabinetIds: []
      });
      logTestResult(
        response.status === 400,
        'Returns 400 for empty array',
        `Status: ${response.status}`
      );
      logTestResult(
        response.body?.message?.includes('Empty'),
        'Error message mentions empty array',
        `Message: ${response.body?.message}`
      );
    } catch (err) {
      logTestResult(false, 'Empty array test failed', err.message);
    }

    logTestTitle('POST /api/v1/cabinet/open - Non-Array cabinetIds');
    try {
      const response = await makeRequest('POST', '/api/v1/cabinet/open', {
        cabinetIds: 'not-array'
      });
      logTestResult(
        response.status === 400,
        'Returns 400 for non-array',
        `Status: ${response.status}`
      );
      logTestResult(
        response.body?.message?.includes('Invalid'),
        'Error message indicates invalid format',
        `Message: ${response.body?.message}`
      );
    } catch (err) {
      logTestResult(false, 'Non-array test failed', err.message);
    }

    logTestTitle('POST /api/v1/cabinet/open - Negative Cabinet ID');
    try {
      const response = await makeRequest('POST', '/api/v1/cabinet/open', {
        cabinetIds: [-1]
      });
      logTestResult(
        response.status === 400,
        'Returns 400 for negative ID',
        `Status: ${response.status}`
      );
      logTestResult(
        response.body?.message?.includes('Invalid'),
        'Error message indicates invalid ID',
        `Message: ${response.body?.message}`
      );
    } catch (err) {
      logTestResult(false, 'Negative ID test failed', err.message);
    }

    logTestTitle('POST /api/v1/cabinet/open - Cabinet ID > 255');
    try {
      const response = await makeRequest('POST', '/api/v1/cabinet/open', {
        cabinetIds: [256]
      });
      logTestResult(
        response.status === 400,
        'Returns 400 for ID > 255',
        `Status: ${response.status}`
      );
      logTestResult(
        response.body?.message?.includes('Invalid'),
        'Error message indicates invalid ID',
        `Message: ${response.body?.message}`
      );
    } catch (err) {
      logTestResult(false, 'ID > 255 test failed', err.message);
    }

    logTestTitle('POST /api/v1/cabinet/open - Floating Point Cabinet ID');
    try {
      const response = await makeRequest('POST', '/api/v1/cabinet/open', {
        cabinetIds: [1.5]
      });
      logTestResult(
        response.status === 400,
        'Returns 400 for floating point',
        `Status: ${response.status}`
      );
      logTestResult(
        response.body?.message?.includes('Invalid'),
        'Error message indicates invalid format',
        `Message: ${response.body?.message}`
      );
    } catch (err) {
      logTestResult(false, 'Floating point test failed', err.message);
    }

    logTestTitle('POST /api/v1/cabinet/open - String in Array');
    try {
      const response = await makeRequest('POST', '/api/v1/cabinet/open', {
        cabinetIds: [1, 'two', 3]
      });
      logTestResult(
        response.status === 400,
        'Returns 400 for string in array',
        `Status: ${response.status}`
      );
      logTestResult(
        response.body?.status === 'error',
        'Response status is "error"',
        `Error: ${response.body?.message}`
      );
    } catch (err) {
      logTestResult(false, 'String in array test failed', err.message);
    }

    // ==================== RESET ENDPOINT ====================
    printSectionHeader('RESET STATUS ENDPOINT');

    logTestTitle('POST /api/v1/cabinet/reset - Reset Cabinet Status');
    try {
      const response = await makeRequest('POST', '/api/v1/cabinet/reset');
      logTestResult(
        response.status === 200,
        'Reset endpoint returns 200',
        `Status: ${response.status}`
      );
      logTestResult(
        response.body && response.body.status === 'success',
        'Response status is "success"',
        `Status: ${response.body?.status}`
      );
      logTestResult(
        response.body && 'message' in response.body && response.body.message.includes('reset'),
        'Response message mentions reset',
        `Message: ${response.body?.message}`
      );

      // Verify status is cleared
      const statusAfterReset = await makeRequest('GET', '/api/v1/cabinet/status');
      logTestResult(
        statusAfterReset.body?.data?.cabinets?.length === 0,
        'Cabinet status cleared after reset',
        `Cabinet count: ${statusAfterReset.body?.data?.cabinets?.length}`
      );
    } catch (err) {
      logTestResult(false, 'Reset request failed', err.message);
    }

    // ==================== ERROR HANDLING ====================
    printSectionHeader('ERROR HANDLING');

    logTestTitle('GET /api/v1/unknown-route - 404 Not Found');
    try {
      const response = await makeRequest('GET', '/api/v1/unknown-route');
      logTestResult(
        response.status === 404,
        'Unknown route returns 404',
        `Status: ${response.status}`
      );
      logTestResult(
        response.body?.status === 'error',
        'Response indicates error',
        `Status: ${response.body?.status}`
      );
    } catch (err) {
      logTestResult(false, '404 test failed', err.message);
    }

    logTestTitle('PUT /api/v1/health - Wrong HTTP Method');
    try {
      const response = await makeRequest('PUT', '/api/v1/health');
      logTestResult(
        response.status === 404,
        'Wrong HTTP method returns 404',
        `Status: ${response.status}`
      );
    } catch (err) {
      logTestResult(false, 'Wrong method test failed', err.message);
    }

    logTestTitle('GET /api/v1/cabinet/open - Wrong HTTP Method on POST Endpoint');
    try {
      const response = await makeRequest('GET', '/api/v1/cabinet/open');
      logTestResult(
        response.status === 404,
        'GET on POST endpoint returns 404',
        `Status: ${response.status}`
      );
    } catch (err) {
      logTestResult(false, 'Wrong method on POST test failed', err.message);
    }

    // ==================== CONTENT TYPE ====================
    printSectionHeader('CONTENT TYPE VALIDATION');

    logTestTitle('Verify JSON Content-Type Headers');
    try {
      const endpoints = [
        ['GET', '/api/v1/health'],
        ['GET', '/api/v1/cabinet/status'],
        ['POST', '/api/v1/cabinet/reset']
      ];

      for (const [method, path] of endpoints) {
        const response = method === 'POST'
          ? await makeRequest(method, path, {})
          : await makeRequest(method, path);

        const isJson = response.headers['content-type']?.includes('application/json');
        logTestResult(
          isJson,
          `${method} ${path} returns JSON`,
          `Content-Type: ${response.headers['content-type']}`
        );
      }
    } catch (err) {
      logTestResult(false, 'Content-Type validation failed', err.message);
    }

  } catch (err) {
    console.error(`${colors.red}Unexpected error during tests:${colors.reset}`, err);
  }

  // ==================== TEST SUMMARY ====================
  printSectionHeader('TEST SUMMARY');

  console.log(`\n${colors.bright}Test Results:${colors.reset}`);
  console.log(`  ${colors.green}Passed: ${passedTests}${colors.reset}`);
  console.log(`  ${colors.red}Failed: ${failedTests}${colors.reset}`);
  console.log(`  ${colors.yellow}Total:  ${totalTests}${colors.reset}`);

  const passPercentage = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;
  console.log(`\n${colors.bright}Pass Rate: ${passPercentage}%${colors.reset}`);

  if (failedTests === 0) {
    console.log(`\n${colors.green}${colors.bright}All tests passed!${colors.reset}`);
  } else {
    console.log(`\n${colors.red}${colors.bright}${failedTests} test(s) failed!${colors.reset}`);
    process.exit(1);
  }

  console.log(`\n${colors.bright}${colors.blue}${'='.repeat(70)}${colors.reset}\n`);
}

/**
 * Check if API is running
 */
async function checkApiAvailability() {
  console.log(`${colors.yellow}Checking API availability at ${BASE_URL}...${colors.reset}\n`);

  for (let i = 0; i < 5; i++) {
    try {
      await makeRequest('GET', '/api/v1/health');
      console.log(`${colors.green}API is available!${colors.reset}\n`);
      return true;
    } catch (err) {
      if (i < 4) {
        console.log(`${colors.yellow}Attempt ${i + 1}/5 - API not yet available, retrying...${colors.reset}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  console.log(`${colors.red}${colors.bright}Error: Could not connect to API at ${BASE_URL}${colors.reset}`);
  console.log(`${colors.yellow}Make sure the API is running. Start with: npm start${colors.reset}\n`);
  return false;
}

/**
 * Main entry point
 */
async function main() {
  const apiAvailable = await checkApiAvailability();

  if (!apiAvailable) {
    process.exit(1);
  }

  await runTests();
  process.exit(failedTests > 0 ? 1 : 0);
}

// Run tests
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
