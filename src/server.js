/**
 * Express REST API Server
 * Cabinet Control Service
 */

import express from 'express';
import dotenv from 'dotenv';
import cabinetService from './services/cabinetService.js';
import cabinetRoutes from './routes/cabinetRoutes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 80;

// Middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/v1', cabinetRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    service: 'Cabinet Control API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/v1/health',
      cabinetStatus: 'GET /api/v1/cabinet/status',
      openCabinets: 'POST /api/v1/cabinet/open',
      resetStatus: 'POST /api/v1/cabinet/reset'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Error handler middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Handle JSON parsing errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid JSON in request body',
      error: err.message
    });
  }

  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

/**
 * Initialize server and connect to serial port
 */
async function start() {
  try {
    // Connect to serial port
    console.log('Attempting to connect to serial port...');
    await cabinetService.connect();
    console.log('Serial port connected successfully');

    // Start HTTP server
    app.listen(PORT, () => {
      console.log(`Express server listening on port ${PORT}`);
      console.log(`API documentation available at http://localhost:${PORT}`);
      console.log(`Health check available at http://localhost:${PORT}/api/v1/health`);
    });

  } catch (err) {
    console.error('Failed to start server:', err.message);
    console.log('Note: Serial port may not be available. API will still run with limited functionality.');

    // Start server anyway, but without serial port connection
    app.listen(PORT, () => {
      console.log(`Express server listening on port ${PORT} (serial port unavailable)`);
      console.log(`API documentation available at http://localhost:${PORT}`);
      console.log(`Health check available at http://localhost:${PORT}/api/v1/health`);
    });
  }
}

/**
 * Graceful shutdown
 */
async function shutdown() {
  console.log('Shutting down gracefully...');
  try {
    await cabinetService.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the server
start();
