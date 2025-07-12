/**
 * 🚀 Infrastructure Monitoring System - Backend Server
 * Enterprise-grade Node.js/Express server with MongoDB and PostgreSQL
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import configurations
const connectMongoDB = require('./src/config/mongodb');
const connectPostgreSQL = require('./src/config/postgresql');
const redisClient = require('./src/config/redis');
const logger = require('./src/config/logger');

// Import routes
const authRoutes = require('./src/routes/auth');
const serverRoutes = require('./src/routes/servers');
const alertRoutes = require('./src/routes/alerts');
const metricsRoutes = require('./src/routes/metrics');
const userRoutes = require('./src/routes/users');
const dashboardRoutes = require('./src/routes/dashboard');

// Import middleware
const authMiddleware = require('./src/middleware/auth');
const errorHandler = require('./src/middleware/errorHandler');
const requestLogger = require('./src/middleware/requestLogger');

// Import services
const AlertService = require('./src/services/AlertService');
const MetricsService = require('./src/services/MetricsService');
const NotificationService = require('./src/services/NotificationService');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Environment variables
const PORT = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:8081',
    'http://192.168.1.10:3000',
    'http://192.168.1.10:8081'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (NODE_ENV === 'production') {
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
} else {
  app.use(morgan('dev'));
}

// Custom request logging
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API Documentation
if (NODE_ENV !== 'production') {
  const swaggerJsdoc = require('swagger-jsdoc');
  const swaggerUi = require('swagger-ui-express');
  
  const options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Infrastructure Monitoring API',
        version: '1.0.0',
        description: 'Enterprise Infrastructure Monitoring System API',
      },
      servers: [
        {
          url: `http://localhost:${PORT}`,
          description: 'Development server',
        },
      ],
    },
    apis: ['./src/routes/*.js'],
  };
  
  const specs = swaggerJsdoc(options);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/servers', authMiddleware, serverRoutes);
app.use('/api/alerts', authMiddleware, alertRoutes);
app.use('/api/metrics', authMiddleware, metricsRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);

// WebSocket connection handling
io.use((socket, next) => {
  // WebSocket authentication middleware
  const token = socket.handshake.auth.token;
  if (token) {
    // Verify JWT token here
    next();
  } else {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  // Join user to their specific room
  socket.on('join', (userId) => {
    socket.join(`user_${userId}`);
    logger.info(`User ${userId} joined room`);
  });
  
  // Handle real-time metric updates
  socket.on('subscribe_metrics', (serverId) => {
    socket.join(`metrics_${serverId}`);
    logger.info(`Client subscribed to metrics for server ${serverId}`);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Make io available to other modules
app.set('io', io);

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Database connections and server startup
async function startServer() {
  try {
    // Connect to databases
    await connectMongoDB();
    await connectPostgreSQL();
    
    // Connect to Redis
    await redisClient.connect();
    
    // Initialize services
    await AlertService.initialize();
    await MetricsService.initialize();
    await NotificationService.initialize();
    
    // Start server
    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 Infrastructure Monitoring Server running on port ${PORT}`);
      logger.info(`📊 Environment: ${NODE_ENV}`);
      logger.info(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      logger.info(`💓 Health Check: http://localhost:${PORT}/health`);
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();

module.exports = app;
