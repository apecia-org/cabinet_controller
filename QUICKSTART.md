# Quick Start Guide

## 30 Second Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template
cp .env.example .env

# 3. Start the server
npm start
```

The API will be available at `http://localhost:80`

## Test the API

### Open your browser or use curl

```bash
# Health check
curl http://localhost/api/v1/health

# Open cabinets 1, 2, 3
curl -X POST http://localhost/api/v1/cabinet/open \
  -H "Content-Type: application/json" \
  -d '{"cabinetIds": [1, 2, 3]}'

# Get cabinet status
curl http://localhost/api/v1/cabinet/status
```

## Configuration

Edit `.env` to change:

```env
PORT=80                    # HTTP port (change if 80 is busy)
SERIAL_PORT=COM3          # Serial port (COM1-COM9 on Windows, /dev/ttyUSB0 on Linux)
BAUD_RATE=9600            # Should match your cabinet device
```

## Development Mode

```bash
npm run dev
```

The server auto-restarts when you modify files.

## API Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/health` | Server health check |
| GET | `/api/v1/cabinet/status` | Get all cabinet statuses |
| POST | `/api/v1/cabinet/open` | Open cabinets (body: `{"cabinetIds": [1,2,3]}`) |
| POST | `/api/v1/cabinet/reset` | Reset status tracking |

## Expected Output on Start

```
[timestamp] Starting server...
Serial port opened: COM3 at 9600 baud
Express server listening on port 80
API documentation available at http://localhost:80
Health check available at http://localhost:80/api/v1/health
```

## What Each File Does

| File | Purpose |
|------|---------|
| `src/server.js` | Main Express app |
| `src/controllers/cabinetController.js` | HTTP request handlers |
| `src/services/cabinetService.js` | Serial port communication |
| `src/routes/cabinetRoutes.js` | API routes |
| `src/utils/serialPort.js` | CRC8 & frame building |

## Troubleshooting

### Port Already in Use
Change PORT in `.env` to 3000 or another available port

### Serial Port Not Found
- Check SERIAL_PORT in `.env`
- On Windows: Use Device Manager to find COM port
- On Linux: Use `ls /dev/tty*`
- On macOS: Use `ls /dev/tty.* /dev/cu.*`

### "Cannot find module" error
Run `npm install` again

## Full Documentation

- **API Details:** See `README.md`
- **Usage Examples:** See `API_EXAMPLES.md`
- **Implementation Details:** See `IMPLEMENTATION_SUMMARY.md`

## Need Help?

1. Check the logs in terminal where server is running
2. Review `README.md` for complete documentation
3. See `API_EXAMPLES.md` for request/response examples
4. Check serial port settings in `.env`

## Next Steps

1. Test the API with provided curl commands
2. Integrate with your application
3. Monitor cabinet status via `/api/v1/cabinet/status`
4. Review `API_EXAMPLES.md` for integration code samples
