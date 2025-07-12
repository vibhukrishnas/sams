import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import rateLimit from 'express-rate-limit';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth';
import alertRoutes from './routes/alerts';
import serverRoutes from './routes/servers';
import reportRoutes from './routes/reports';
import dashboardRoutes from './routes/dashboard';
import notificationRoutes from './routes/notifications';
import incidentRoutes from './routes/incidents';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { logger } from './utils/logger';

// Import services
import { DatabaseService } from './services/DatabaseService';
import { WebSocketService } from './services/WebSocketService';
import { MonitoringService } from './services/MonitoringService';
import { NotificationService } from './services/NotificationService';
import { SchedulerService } from './services/SchedulerService';

class SAMSServer {
  private app: express.Application;
  private server: any;
  private io: SocketIOServer;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '8080');
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: process.env.FRONTEND_URL || "*",
        methods: ["GET", "POST"]
      }
    });

    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeServices();
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    
    // CORS configuration
    this.app.use(cors({
      origin: process.env.FRONTEND_URL || "*",
      credentials: true
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.'
    });
    this.app.use('/api/', limiter);

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Compression middleware
    this.app.use(compression());

    // Logging middleware
    this.app.use(morgan('combined', {
      stream: { write: (message) => logger.info(message.trim()) }
    }));
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0'
      });
    });

    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/alerts', authMiddleware, alertRoutes);
    this.app.use('/api/servers', authMiddleware, serverRoutes);
    this.app.use('/api/reports', authMiddleware, reportRoutes);
    this.app.use('/api/dashboard', authMiddleware, dashboardRoutes);
    this.app.use('/api/notifications', authMiddleware, notificationRoutes);
    this.app.use('/api/incidents', authMiddleware, incidentRoutes);

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl
      });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }

  private async initializeServices(): Promise<void> {
    try {
      // Initialize database
      await DatabaseService.initialize();
      logger.info('Database service initialized');

      // Initialize WebSocket service
      WebSocketService.initialize(this.io);
      logger.info('WebSocket service initialized');

      // Initialize monitoring service
      await MonitoringService.initialize();
      logger.info('Monitoring service initialized');

      // Initialize notification service
      await NotificationService.initialize();
      logger.info('Notification service initialized');

      // Initialize scheduler service
      SchedulerService.initialize();
      logger.info('Scheduler service initialized');

    } catch (error) {
      logger.error('Failed to initialize services:', error);
      process.exit(1);
    }
  }

  public async start(): Promise<void> {
    try {
      this.server.listen(this.port, '0.0.0.0', () => {
        logger.info(`🚀 SAMS Server running on port ${this.port}`);
        logger.info(`📊 Dashboard: http://localhost:${this.port}/health`);
        logger.info(`🔌 WebSocket: ws://localhost:${this.port}`);
      });

      // Graceful shutdown
      process.on('SIGTERM', this.gracefulShutdown.bind(this));
      process.on('SIGINT', this.gracefulShutdown.bind(this));

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  private async gracefulShutdown(): Promise<void> {
    logger.info('Received shutdown signal, closing server gracefully...');
    
    this.server.close(() => {
      logger.info('HTTP server closed');
      
      // Close database connections
      DatabaseService.close();
      
      // Close other services
      MonitoringService.stop();
      SchedulerService.stop();
      
      logger.info('Server shutdown complete');
      process.exit(0);
    });
  }
}

// Start the server
const server = new SAMSServer();
server.start().catch((error) => {
  logger.error('Failed to start SAMS server:', error);
  process.exit(1);
});

export default SAMSServer;
