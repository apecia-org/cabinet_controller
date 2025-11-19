# Shared Response Format Schema

## Purpose
This schema ensures all API endpoints return consistent JSON responses.

## Response Format Standard

### Success Response
```json
{
  "status": "success",
  "data": {
    // Endpoint-specific data
  },
  "timestamp": "2025-01-14T12:00:00.000Z"
}
```

### Error Response
```json
{
  "status": "error",
  "message": "Human-readable error description",
  "timestamp": "2025-01-14T12:00:00.000Z"
}
```

**IMPORTANT:** Do NOT include `error` field with stack traces in production.

## Status Codes

| Code | Meaning | When to Use |
|------|---------|-------------|
| 200 | OK | Successful operation |
| 400 | Bad Request | Invalid input (validation failed) |
| 500 | Internal Server Error | Unexpected error in server |
| 503 | Service Unavailable | Serial port not connected |

## Field Specifications

### status (required)
- Type: string
- Values: "success" | "error"
- Description: Indicates if request succeeded

### data (required for success)
- Type: object
- Description: Endpoint-specific response data
- Only present when status="success"

### message (required for error)
- Type: string
- Description: Human-readable error message
- Only present when status="error"
- Must NOT expose internal implementation details

### timestamp (required)
- Type: string
- Format: ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)
- Description: Server time when response generated
- Use: `new Date().toISOString()`

## Examples by Endpoint

### GET /api/v1/health
```json
{
  "status": "success",
  "data": {
    "uptime": 12345,
    "serial_port": {
      "connected": true,
      "path": "COM3"
    }
  },
  "timestamp": "2025-01-14T12:00:00.000Z"
}
```

### POST /api/v1/cabinet/open (success)
```json
{
  "status": "success",
  "data": {
    "opened": [1, 2, 3],
    "failed": []
  },
  "timestamp": "2025-01-14T12:00:00.000Z"
}
```

### POST /api/v1/cabinet/open (validation error)
```json
{
  "status": "error",
  "message": "Cabinet ID 256 out of range (0-255)",
  "timestamp": "2025-01-14T12:00:00.000Z"
}
```

### POST /api/v1/cabinet/open (serial port unavailable)
```json
{
  "status": "error",
  "message": "Serial port not connected",
  "timestamp": "2025-01-14T12:00:00.000Z"
}
```

## Validation Rules

All agents must follow these rules:

1. **Always include status field** - Never omit it
2. **Always include timestamp** - Use ISO 8601 format
3. **Success includes data** - Never send status="success" without data
4. **Error includes message** - Never send status="error" without message
5. **No stack traces in production** - Only log them server-side
6. **Consistent field names** - Don't use "result" instead of "data"

## Implementation Example

```javascript
// src/controllers/cabinetController.js

// Success response helper
function successResponse(data) {
  return {
    status: 'success',
    data,
    timestamp: new Date().toISOString()
  };
}

// Error response helper
function errorResponse(message) {
  return {
    status: 'error',
    message,
    timestamp: new Date().toISOString()
  };
}

// Usage
export async function openCabinets(req, res) {
  try {
    const result = await cabinetService.openCabinets(req.body.cabinetIds);
    res.status(200).json(successResponse(result));
  } catch (err) {
    logger.error({ err }, 'Failed to open cabinets');
    res.status(500).json(errorResponse('Internal server error'));
  }
}
```

## Testing Response Format

All tests should validate response format:

```javascript
test('Response has correct format', async () => {
  const response = await request(app).get('/api/v1/health');

  expect(response.body).toHaveProperty('status');
  expect(response.body).toHaveProperty('timestamp');

  if (response.body.status === 'success') {
    expect(response.body).toHaveProperty('data');
    expect(response.body).not.toHaveProperty('message');
  } else {
    expect(response.body).toHaveProperty('message');
    expect(response.body).not.toHaveProperty('data');
  }
});
```
