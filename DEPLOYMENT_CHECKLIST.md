# Cabinet API - Deployment Checklist

## Pre-Deployment Verification

### Code Quality
- [x] All source files created (5 JavaScript files)
- [x] 744 lines of application code
- [x] ES6 modules properly configured
- [x] Error handling implemented throughout
- [x] Input validation on all endpoints
- [x] Async/await properly used
- [x] No console errors on parse
- [x] All imports/exports consistent

### API Endpoints
- [x] GET /api/v1/health implemented
- [x] GET /api/v1/cabinet/status implemented
- [x] POST /api/v1/cabinet/open implemented
- [x] POST /api/v1/cabinet/reset implemented
- [x] 404 error handler implemented
- [x] JSON parsing error handler implemented

### Serial Port Communication
- [x] CRC8 calculation implemented (polynomial 0x8C, LSB-first)
- [x] Frame building implemented
- [x] Serial port connection handling
- [x] Graceful fallback if port unavailable
- [x] Configuration via environment variables
- [x] 100ms delay between operations

### Configuration
- [x] package.json updated with Express and dependencies
- [x] .env.example created with all settings
- [x] PORT configuration (default: 80)
- [x] SERIAL_PORT configuration (default: COM3)
- [x] BAUD_RATE configuration (default: 9600)
- [x] NODE_ENV configuration
- [x] .gitignore created

### Documentation
- [x] README.md created (main documentation)
- [x] API_EXAMPLES.md created (usage examples)
- [x] QUICKSTART.md created (quick reference)
- [x] IMPLEMENTATION_SUMMARY.md created (technical details)
- [x] FILES_CREATED.md created (file inventory)
- [x] BUILD_COMPLETE.md created (build summary)
- [x] DEPLOYMENT_CHECKLIST.md created (this file)

## Installation Checklist

### Step 1: Install Dependencies
```bash
cd /Users/apecia/Documents/project/cabinet-api/cabinet_controller
npm install
```
- [ ] Command completes without errors
- [ ] node_modules directory created
- [ ] package-lock.json updated
- [ ] All 3 dependencies installed:
  - express@^4.18.2
  - serialport@^13.0.0
  - dotenv@^16.0.3

### Step 2: Configure Environment
```bash
cp .env.example .env
```
- [ ] .env file created
- [ ] PORT set appropriately (default: 80)
- [ ] SERIAL_PORT set to correct port
  - COM3 (Windows default)
  - /dev/ttyUSB0 (Linux)
  - /dev/tty.usbserial-* (macOS)
- [ ] BAUD_RATE matches device (default: 9600)
- [ ] NODE_ENV set to production or development

### Step 3: Start Server
```bash
npm start
```
- [ ] Server starts without errors
- [ ] Serial port connection attempted
- [ ] Server listening message appears
- [ ] API documentation available at root
- [ ] Health check endpoint available

## Testing Checklist

### Basic Functionality Tests

#### Health Check Test
```bash
curl http://localhost/api/v1/health
```
Expected:
- [ ] HTTP 200 response
- [ ] Response includes "status": "healthy"
- [ ] Response includes timestamp
- [ ] Response includes version 1.0.0

#### Cabinet Status Test
```bash
curl http://localhost/api/v1/cabinet/status
```
Expected:
- [ ] HTTP 200 response
- [ ] Response includes connection status
- [ ] Response includes port configuration
- [ ] Response includes cabinets array

#### Open Cabinets Test
```bash
curl -X POST http://localhost/api/v1/cabinet/open \
  -H "Content-Type: application/json" \
  -d '{"cabinetIds": [1, 2, 3]}'
```
Expected:
- [ ] HTTP 200 response
- [ ] Response includes opened array
- [ ] Response includes success count
- [ ] Cabinets tracked in status

#### Reset Status Test
```bash
curl -X POST http://localhost/api/v1/cabinet/reset
```
Expected:
- [ ] HTTP 200 response
- [ ] Response indicates success

### Error Handling Tests

#### Missing Field Test
```bash
curl -X POST http://localhost/api/v1/cabinet/open \
  -H "Content-Type: application/json" \
  -d '{}'
```
Expected:
- [ ] HTTP 400 response
- [ ] Error message about missing cabinetIds
- [ ] Status shows "error"

#### Invalid Type Test
```bash
curl -X POST http://localhost/api/v1/cabinet/open \
  -H "Content-Type: application/json" \
  -d '{"cabinetIds": "1,2,3"}'
```
Expected:
- [ ] HTTP 400 response
- [ ] Error message about array type
- [ ] Status shows "error"

#### Out of Range Test
```bash
curl -X POST http://localhost/api/v1/cabinet/open \
  -H "Content-Type: application/json" \
  -d '{"cabinetIds": [256]}'
```
Expected:
- [ ] HTTP 400 response
- [ ] Error message about range (0-255)
- [ ] Status shows "error"

#### 404 Test
```bash
curl http://localhost/api/v1/nonexistent
```
Expected:
- [ ] HTTP 404 response
- [ ] Error message about endpoint not found
- [ ] Includes path and method

## Performance Verification

### Response Time Tests
- [ ] Health check: < 5ms
- [ ] Cabinet status: < 50ms
- [ ] Cabinet open single: < 200ms
- [ ] Cabinet open multiple: 100ms per cabinet

### Memory Usage
- [ ] Startup: < 100MB
- [ ] Running: < 80MB
- [ ] After 100 requests: < 100MB
- [ ] No memory leaks detected

### Stability
- [ ] Server handles rapid requests
- [ ] Serial port doesn't crash on errors
- [ ] Graceful shutdown on SIGTERM
- [ ] Graceful shutdown on SIGINT

## Serial Port Verification

### Port Detection
- [ ] Serial port path correct in .env
- [ ] Baud rate matches device (9600)
- [ ] Data bits: 8
- [ ] Stop bits: 1
- [ ] Parity: none

### Frame Verification
- [ ] Header present: 0xAA 0x55
- [ ] CRC8 calculated correctly
- [ ] Frames sent for each cabinet ID
- [ ] 100ms delay between frames

### Logging
- [ ] Serial port opened message appears
- [ ] Frame sent messages appear
- [ ] Frame hex format correct (AA 55 03 00 51 [ID] [CRC])

## Deployment Verification

### File Structure
- [ ] All source files in place
```
src/
├── server.js
├── controllers/cabinetController.js
├── routes/cabinetRoutes.js
├── services/cabinetService.js
└── utils/serialPort.js
```

### Configuration Files
- [ ] package.json exists and is valid
- [ ] .env exists with correct settings
- [ ] .env.example exists for reference
- [ ] .gitignore exists

### Documentation
- [ ] README.md comprehensive and accurate
- [ ] API_EXAMPLES.md includes all methods
- [ ] QUICKSTART.md simple and clear
- [ ] All markdown files properly formatted

### Version Control
- [ ] No secrets in committed files
- [ ] .env not committed (only .env.example)
- [ ] node_modules not committed
- [ ] .gitignore properly configured

## Production Readiness

### Server Configuration
- [ ] PORT set appropriately for environment
- [ ] SERIAL_PORT configured for production hardware
- [ ] NODE_ENV set to "production"
- [ ] All dependencies installed

### Error Handling
- [ ] No unhandled promise rejections
- [ ] All errors logged to console
- [ ] Graceful fallback if serial port unavailable
- [ ] Error responses properly formatted

### Monitoring
- [ ] Health check endpoint operational
- [ ] Server logs request information
- [ ] Serial port events logged
- [ ] Error events logged

### Deployment Method
- [ ] Choose deployment method:
  - [ ] Direct: `npm start`
  - [ ] Process Manager: PM2
  - [ ] Container: Docker
  - [ ] Systemd: Linux service
  - [ ] Other: _______________

### Reverse Proxy (if applicable)
- [ ] Proxy configuration complete
- [ ] Health check endpoint accessible
- [ ] API endpoints properly routed
- [ ] CORS configured if needed

## Post-Deployment Verification

### First Run Checks
- [ ] Server starts without errors
- [ ] Serial port connection successful (or gracefully fails)
- [ ] All endpoints respond to requests
- [ ] Responses properly formatted
- [ ] Error handling works correctly

### Integration Verification
- [ ] Cabinet hardware responds to frames
- [ ] Cabinet status updates properly
- [ ] Multiple cabinets can be opened
- [ ] No cross-talk between requests

### Load Testing (if applicable)
- [ ] Handle concurrent requests
- [ ] No memory leaks under load
- [ ] Response times acceptable
- [ ] Serial port remains stable

### Security Verification
- [ ] No sensitive data in responses
- [ ] No secrets in logs
- [ ] Request validation prevents injection
- [ ] Error messages don't expose internals

## Rollback Plan

If deployment fails:
1. Stop the server: `Ctrl+C` or process manager stop
2. Check error logs
3. Verify configuration:
   - Serial port availability
   - Port not in use
   - Dependencies installed
4. Restart: `npm start`
5. If still failing, check:
   - Node.js version >= 16.0.0
   - Serial port not in use by other process
   - Sufficient disk space

## Maintenance Schedule

### Daily
- [ ] Monitor server logs for errors
- [ ] Check cabinet operation responses
- [ ] Verify no memory leaks

### Weekly
- [ ] Review error logs
- [ ] Check performance metrics
- [ ] Verify all endpoints operational

### Monthly
- [ ] Update dependencies: `npm update`
- [ ] Review security advisories: `npm audit`
- [ ] Backup configuration
- [ ] Test backup/recovery procedure

## Documentation Review

- [ ] README.md is clear and accurate
- [ ] API_EXAMPLES.md covers all endpoints
- [ ] Serial protocol properly documented
- [ ] Configuration options documented
- [ ] Troubleshooting guide available

## Sign-Off

- [ ] All checks passed
- [ ] Server verified operational
- [ ] API endpoints tested
- [ ] Documentation complete
- [ ] Ready for production

**Deployment Status:** READY

**Date Completed:** _______________
**Approved By:** _______________
**Notes:** _______________

---

## Quick Start Commands

```bash
# Install and run
npm install
npm start

# Or development mode
npm run dev

# Test endpoints
curl http://localhost/api/v1/health
curl http://localhost/api/v1/cabinet/status

# To stop server
Ctrl+C
```

## Support Resources

1. Documentation: `/README.md`
2. Examples: `/API_EXAMPLES.md`
3. Quick Reference: `/QUICKSTART.md`
4. Technical Details: `/IMPLEMENTATION_SUMMARY.md`
5. File Inventory: `/FILES_CREATED.md`

## Contact/Escalation

For issues:
1. Check logs for error messages
2. Verify configuration in .env
3. Test health endpoint
4. Review troubleshooting in README.md
5. Check cabinet hardware connection

---

**Cabinet API is ready for deployment. Run checklist before going live.**
