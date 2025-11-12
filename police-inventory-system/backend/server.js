const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
// Comment out rate limiting for now
// const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const officerRoutes = require('./routes/officer');
const equipmentRoutes = require('./routes/equipment');

const app = express();

// Trust proxy for rate limiting (when enabled)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());


console.log('⚠️  RATE LIMITING DISABLED FOR DEVELOPMENT');

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ MongoDB connected successfully');
  console.log('📊 Database:', mongoose.connection.db.databaseName);
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  process.exit(1);
});

// Routes (no rate limiting)
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/officer', officerRoutes);
app.use('/api/equipment', equipmentRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    rateLimiting: 'DISABLED',
    uptime: process.uptime()
  });
});

// Test route to verify server is working
app.get('/', (req, res) => {
  res.json({
    message: 'Police Inventory Management System API',
    version: '1.0.0',
    status: 'Server is running successfully',
    environment: process.env.NODE_ENV || 'development',
    rateLimiting: 'DISABLED FOR DEVELOPMENT'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Server Error:', error.message);

  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Something went wrong!',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: error.stack 
    })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false,
    message: `Route ${req.originalUrl} not found` 
  });
});

const getInitialPort = () => {
  const parsed = parseInt(process.env.PORT, 10);
  return Number.isFinite(parsed) ? parsed : 5000;
};

const startServer = (port, remainingRetries = 5) => {
  const server = app.listen(port);

  server.on('listening', () => {
    const { port: activePort } = server.address();
    console.log(`🚀 Server running on port ${activePort}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 API Base URL: http://localhost:${activePort}/api`);
    console.log(`🏠 Frontend URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
    console.log(`🔓 Rate Limiting: DISABLED FOR DEVELOPMENT`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && remainingRetries > 0) {
      const nextPort = port + 1;
      console.warn(`⚠️  Port ${port} is already in use. Attempting to use port ${nextPort} (${remainingRetries - 1} retries left).`);
      setTimeout(() => startServer(nextPort, remainingRetries - 1), 500);
      return;
    }

    if (error.code === 'EADDRINUSE') {
      console.error(`❌ All fallback attempts failed. Please free port ${port} or set the PORT environment variable.`);
    } else {
      console.error('❌ Server failed to start:', error);
    }
    process.exit(1);
  });
};

startServer(getInitialPort());

module.exports = app;
