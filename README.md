# Cabinet Control REST API

A Node.js Express REST API service for controlling cabinets via serial port communication.

## Features

- RESTful API endpoints for cabinet control
- Serial port communication with CRC8 checksum validation
- JSON-based request/response format
- Health check endpoint
- Cabinet status tracking
- Configurable serial port settings
- Graceful error handling

## Architecture

```
src/
├── server.js                 # Main Express application
├── controllers/
│   └── cabinetController.js  # HTTP request handlers
├── routes/
│   └── cabinetRoutes.js      # API route definitions
├── services/
│   └── cabinetService.js     # Serial port communication logic
└── utils/
    └── serialPort.js         # CRC8 calculation and frame building
```

## Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

## Configuration

Edit `.env` file to configure:

```env
PORT=80                    # HTTP server port
SERIAL_PORT=COM3          # Serial port path (e.g., /dev/ttyUSB0 on Linux, COM3 on Windows)
BAUD_RATE=9600            # Serial port baud rate (8N1)
NODE_ENV=production       # Environment mode
```

## Running the Server

```bash
# Start production server
npm start

# Start development server with file watching
npm run dev
```

The server will:
1. Attempt to connect to the configured serial port
2. Listen for HTTP requests on the configured port
3. Gracefully handle serial port connection failures

## API Endpoints

### 1. Health Check
```
GET /api/v1/health
```

Returns server health status and timestamp.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-11-13T10:30:45.123Z",
  "service": "cabinet-api",
  "version": "1.0.0"
}
```

### 2. Get Cabinet Status
```
GET /api/v1/cabinet/status
```

Returns current status of all cabinets that have been opened.

**Response:**
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
      },
      {
        "id": 2,
        "status": "opened",
        "timestamp": "2024-11-13T10:30:45.200Z"
      }
    ]
  },
  "timestamp": "2024-11-13T10:30:46.123Z"
}
```

### 3. Open Cabinets
```
POST /api/v1/cabinet/open
Content-Type: application/json

{
  "cabinetIds": [1, 2, 3]
}
```

Opens specified cabinets via serial port.

**Request Body:**
- `cabinetIds` (Array<number>, required): Cabinet IDs to open (0-255)

**Response:**
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
        "timestamp": "2024-11-13T10:30:45.200Z"
      }
    ],
    "failed": [],
    "total": 2,
    "successCount": 2,
    "failureCount": 0
  },
  "timestamp": "2024-11-13T10:30:46.123Z"
}
```

**Error Response:**
```json
{
  "status": "error",
  "message": "Invalid cabinetIds format",
  "error": "cabinetIds must be an array of numbers"
}
```

### 4. Reset Status (Internal)
```
POST /api/v1/cabinet/reset
```

Resets cabinet status tracking.

**Response:**
```json
{
  "status": "success",
  "message": "Cabinet status tracking reset",
  "timestamp": "2024-11-13T10:30:46.123Z"
}
```

## Serial Protocol

The API communicates with cabinets using the following protocol:

### Frame Structure
```
[Header1] [Header2] [DataLength] [BoardAddr] [Instruction] [Data...] [CRC8]
   0xAA      0x55      0x02        0x00        0x51        [ID]     [CRC]
```

- **Header**: 0xAA 0x55 (fixed frame header)
- **DataLength**: Length of (BoardAddr + Instruction + Data) = 2 + data length
- **BoardAddress**: 0x00 (default)
- **Instruction**: 0x51 (open cabinet command)
- **Data**: Cabinet ID (0-255)
- **CRC8**: LSB-first polynomial 0x8C checksum

### Example Frame
To open cabinet ID 1:
```
AA 55 03 00 51 01 A5
```

## Error Handling

The API provides consistent error responses with appropriate HTTP status codes:

- **400 Bad Request**: Invalid input format or missing required fields
- **500 Internal Server Error**: Server-side errors (including serial port failures)

Error responses always include:
- `status`: "error"
- `message`: Human-readable error description
- `error`: Detailed error message

## Logging

The server logs all significant events:

```
[timestamp] Starting server...
Serial port opened: COM3 at 9600 baud
Express server listening on port 80
[timestamp] GET /api/v1/health
[timestamp] POST /api/v1/cabinet/open
Frame sent: AA 55 03 00 51 01 A5
```

## Development Notes

### Adding New Endpoints

1. Create a handler function in `src/controllers/cabinetController.js`
2. Add a route in `src/routes/cabinetRoutes.js`
3. Update this README with endpoint documentation

### Testing

Use curl or Postman to test endpoints:

```bash
# Health check
curl http://localhost/api/v1/health

# Get cabinet status
curl http://localhost/api/v1/cabinet/status

# Open cabinets
curl -X POST http://localhost/api/v1/cabinet/open \
  -H "Content-Type: application/json" \
  -d '{"cabinetIds": [1, 2, 3]}'

# Reset status
curl -X POST http://localhost/api/v1/cabinet/reset
```

### Serial Port Troubleshooting

- **Linux**: Use `/dev/ttyUSB0` or `/dev/ttyACM0`
- **Windows**: Use `COM1`, `COM2`, `COM3`, etc.
- **macOS**: Use `/dev/tty.usbserial-*` or `/dev/cu.usbserial-*`

To list available ports:

```bash
# Windows (PowerShell)
Get-WmiObject Win32_SerialPort

# Linux
ls /dev/tty*

# macOS
ls /dev/tty.* /dev/cu.*
```

## Performance

- Minimal dependencies for fast startup
- Async/await for non-blocking I/O
- 100ms delay between cabinet operations to ensure serial communication stability
- Response timeout: 30 seconds (system default)

## License

MIT
