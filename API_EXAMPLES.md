# Cabinet API - Usage Examples

## Setup

Before testing, ensure the server is running:

```bash
npm install
npm start
```

The server will be available at `http://localhost:80` (or `http://localhost` without port specification).

## Health Check

### cURL
```bash
curl -X GET http://localhost/api/v1/health
```

### Response
```json
{
  "status": "healthy",
  "timestamp": "2024-11-13T10:30:45.123Z",
  "service": "cabinet-api",
  "version": "1.0.0"
}
```

## Get Cabinet Status

### cURL
```bash
curl -X GET http://localhost/api/v1/cabinet/status
```

### Response
```json
{
  "status": "success",
  "data": {
    "connected": true,
    "portPath": "COM3",
    "baudRate": 9600,
    "cabinets": [
      {
        "id": 1,
        "status": "opened",
        "timestamp": "2024-11-13T10:30:45.123Z"
      }
    ]
  },
  "timestamp": "2024-11-13T10:30:46.123Z"
}
```

## Open Single Cabinet

### cURL
```bash
curl -X POST http://localhost/api/v1/cabinet/open \
  -H "Content-Type: application/json" \
  -d '{"cabinetIds": [1]}'
```

### PowerShell
```powershell
$body = @{
    cabinetIds = @(1)
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost/api/v1/cabinet/open" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

### Response
```json
{
  "status": "success",
  "message": "Cabinet operation completed",
  "data": {
    "opened": [
      {
        "id": 1,
        "status": "opened",
        "timestamp": "2024-11-13T10:30:45.123Z"
      }
    ],
    "failed": [],
    "total": 1,
    "successCount": 1,
    "failureCount": 0
  },
  "timestamp": "2024-11-13T10:30:46.123Z"
}
```

## Open Multiple Cabinets

### cURL
```bash
curl -X POST http://localhost/api/v1/cabinet/open \
  -H "Content-Type: application/json" \
  -d '{"cabinetIds": [1, 2, 3, 5, 10]}'
```

### JavaScript (Fetch API)
```javascript
fetch('http://localhost/api/v1/cabinet/open', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    cabinetIds: [1, 2, 3, 5, 10]
  })
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

### Python
```python
import requests
import json

url = 'http://localhost/api/v1/cabinet/open'
headers = {'Content-Type': 'application/json'}
payload = {'cabinetIds': [1, 2, 3, 5, 10]}

response = requests.post(url, headers=headers, json=payload)
print(json.dumps(response.json(), indent=2))
```

### Response
```json
{
  "status": "success",
  "message": "Cabinet operation completed",
  "data": {
    "opened": [
      {
        "id": 1,
        "status": "opened",
        "timestamp": "2024-11-13T10:30:45.123Z"
      },
      {
        "id": 2,
        "status": "opened",
        "timestamp": "2024-11-13T10:30:45.100Z"
      },
      {
        "id": 3,
        "status": "opened",
        "timestamp": "2024-11-13T10:30:45.200Z"
      },
      {
        "id": 5,
        "status": "opened",
        "timestamp": "2024-11-13T10:30:45.300Z"
      },
      {
        "id": 10,
        "status": "opened",
        "timestamp": "2024-11-13T10:30:45.400Z"
      }
    ],
    "failed": [],
    "total": 5,
    "successCount": 5,
    "failureCount": 0
  },
  "timestamp": "2024-11-13T10:30:46.123Z"
}
```

## Reset Cabinet Status

### cURL
```bash
curl -X POST http://localhost/api/v1/cabinet/reset
```

### Response
```json
{
  "status": "success",
  "message": "Cabinet status tracking reset",
  "timestamp": "2024-11-13T10:30:46.123Z"
}
```

## Error Examples

### Missing cabinetIds
```bash
curl -X POST http://localhost/api/v1/cabinet/open \
  -H "Content-Type: application/json" \
  -d '{}'
```

Response (400 Bad Request):
```json
{
  "status": "error",
  "message": "Missing required field: cabinetIds",
  "error": "cabinetIds array is required in request body"
}
```

### Invalid cabinetIds type
```bash
curl -X POST http://localhost/api/v1/cabinet/open \
  -H "Content-Type: application/json" \
  -d '{"cabinetIds": "1,2,3"}'
```

Response (400 Bad Request):
```json
{
  "status": "error",
  "message": "Invalid cabinetIds format",
  "error": "cabinetIds must be an array of numbers"
}
```

### Cabinet ID out of range
```bash
curl -X POST http://localhost/api/v1/cabinet/open \
  -H "Content-Type: application/json" \
  -d '{"cabinetIds": [256]}'
```

Response (400 Bad Request):
```json
{
  "status": "error",
  "message": "Invalid cabinet ID format",
  "error": "Cabinet ID at index 0 must be an integer between 0 and 255, got 256"
}
```

### Non-existent endpoint
```bash
curl -X GET http://localhost/api/v1/cabinets
```

Response (404 Not Found):
```json
{
  "status": "error",
  "message": "Endpoint not found",
  "path": "/api/v1/cabinets",
  "method": "GET"
}
```

## Testing with Postman

1. Import the following as raw request:

```
POST /api/v1/cabinet/open HTTP/1.1
Host: localhost
Content-Type: application/json

{
  "cabinetIds": [1, 2, 3]
}
```

2. Or use Postman's Body tab:
   - Set method to POST
   - URL: `http://localhost/api/v1/cabinet/open`
   - Body: Raw JSON
   ```json
   {
     "cabinetIds": [1, 2, 3]
   }
   ```

## Monitoring

View server logs in the terminal where the server is running:

```
[2024-11-13T10:30:45.123Z] GET /api/v1/health
[2024-11-13T10:30:46.123Z] POST /api/v1/cabinet/open
Frame sent: AA 55 03 00 51 01 A5
```

## Performance Notes

- Each cabinet open request includes a 100ms delay between serial port writes for stability
- Response times typically 50-200ms depending on serial port availability
- Health check is always fast (< 5ms)

## Integration Examples

### Node.js/Express
```javascript
import axios from 'axios';

const openCabinets = async (cabinetIds) => {
  try {
    const response = await axios.post('http://localhost/api/v1/cabinet/open', {
      cabinetIds
    });
    console.log('Success:', response.data.data.successCount, 'cabinets opened');
  } catch (error) {
    console.error('Error:', error.response?.data?.error);
  }
};

openCabinets([1, 2, 3]);
```

### C#/.NET
```csharp
using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

var client = new HttpClient();
var request = new StringContent(
  @"{""cabinetIds"": [1, 2, 3]}",
  Encoding.UTF8,
  "application/json");

var response = await client.PostAsync(
  "http://localhost/api/v1/cabinet/open",
  request);

var content = await response.Content.ReadAsStringAsync();
Console.WriteLine(content);
```
