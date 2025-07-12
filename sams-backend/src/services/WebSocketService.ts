import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { DatabaseService } from './DatabaseService';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
  role?: string;
}

export class WebSocketService {
  private static io: SocketIOServer;
  private static connectedClients: Map<string, AuthenticatedSocket> = new Map();

  public static initialize(io: SocketIOServer): void {
    this.io = io;
    this.setupMiddleware();
    this.setupEventHandlers();
    logger.info('WebSocket service initialized');
  }

  private static setupMiddleware(): void {
    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
        
        // Verify user exists and is active
        const user = await DatabaseService.findById('users', decoded.userId);
        if (!user || user.status !== 'active') {
          return next(new Error('Invalid user'));
        }

        socket.userId = decoded.userId;
        socket.username = decoded.username;
        socket.role = decoded.role;
        
        next();
      } catch (error) {
        logger.error('WebSocket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  private static setupEventHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info(`Client connected: ${socket.username} (${socket.id})`);
      
      // Store connected client
      this.connectedClients.set(socket.id, socket);

      // Join user-specific room
      socket.join(`user:${socket.userId}`);
      
      // Join role-based room
      socket.join(`role:${socket.role}`);

      // Handle client events
      this.setupClientEventHandlers(socket);

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        logger.info(`Client disconnected: ${socket.username} (${socket.id}) - ${reason}`);
        this.connectedClients.delete(socket.id);
      });

      // Send initial connection confirmation
      socket.emit('connected', {
        message: 'Connected to SAMS WebSocket server',
        userId: socket.userId,
        timestamp: new Date().toISOString()
      });
    });
  }

  private static setupClientEventHandlers(socket: AuthenticatedSocket): void {
    // Subscribe to specific alert types
    socket.on('subscribe:alerts', (data) => {
      const { severity, category, serverId } = data;
      
      if (severity) socket.join(`alerts:severity:${severity}`);
      if (category) socket.join(`alerts:category:${category}`);
      if (serverId) socket.join(`alerts:server:${serverId}`);
      
      logger.info(`Client ${socket.username} subscribed to alerts with filters:`, data);
    });

    // Subscribe to server monitoring
    socket.on('subscribe:servers', (data) => {
      const { serverIds } = data;
      
      if (Array.isArray(serverIds)) {
        serverIds.forEach(serverId => {
          socket.join(`server:${serverId}`);
        });
      }
      
      logger.info(`Client ${socket.username} subscribed to servers:`, serverIds);
    });

    // Subscribe to dashboard updates
    socket.on('subscribe:dashboard', () => {
      socket.join('dashboard:updates');
      logger.info(`Client ${socket.username} subscribed to dashboard updates`);
    });

    // Handle ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    // Handle client status updates
    socket.on('status:update', (data) => {
      logger.info(`Status update from ${socket.username}:`, data);
      // Broadcast status to other clients if needed
    });
  }

  // Broadcast new alert to relevant clients
  public static broadcastAlert(alert: any): void {
    if (!this.io) return;

    // Broadcast to all connected clients
    this.io.emit('alert:new', {
      type: 'alert:new',
      data: alert,
      timestamp: new Date().toISOString()
    });

    // Broadcast to severity-specific rooms
    this.io.to(`alerts:severity:${alert.severity}`).emit('alert:severity', {
      type: 'alert:severity',
      data: alert,
      timestamp: new Date().toISOString()
    });

    // Broadcast to category-specific rooms
    this.io.to(`alerts:category:${alert.category}`).emit('alert:category', {
      type: 'alert:category',
      data: alert,
      timestamp: new Date().toISOString()
    });

    // Broadcast to server-specific rooms
    if (alert.server_id) {
      this.io.to(`alerts:server:${alert.server_id}`).emit('alert:server', {
        type: 'alert:server',
        data: alert,
        timestamp: new Date().toISOString()
      });
    }

    logger.info(`Alert broadcasted: ${alert.title} (${alert.id})`);
  }

  // Broadcast alert updates (acknowledge, resolve, etc.)
  public static broadcastAlertUpdate(alert: any): void {
    if (!this.io) return;

    this.io.emit('alert:updated', {
      type: 'alert:updated',
      data: alert,
      timestamp: new Date().toISOString()
    });

    logger.info(`Alert update broadcasted: ${alert.id}`);
  }

  // Broadcast server status updates
  public static broadcastServerUpdate(server: any): void {
    if (!this.io) return;

    this.io.emit('server:updated', {
      type: 'server:updated',
      data: server,
      timestamp: new Date().toISOString()
    });

    // Broadcast to server-specific room
    this.io.to(`server:${server.id}`).emit('server:status', {
      type: 'server:status',
      data: server,
      timestamp: new Date().toISOString()
    });

    logger.info(`Server update broadcasted: ${server.name} (${server.id})`);
  }

  // Broadcast dashboard metrics updates
  public static broadcastDashboardUpdate(metrics: any): void {
    if (!this.io) return;

    this.io.to('dashboard:updates').emit('dashboard:metrics', {
      type: 'dashboard:metrics',
      data: metrics,
      timestamp: new Date().toISOString()
    });

    logger.info('Dashboard metrics broadcasted');
  }

  // Send notification to specific user
  public static sendUserNotification(userId: string, notification: any): void {
    if (!this.io) return;

    this.io.to(`user:${userId}`).emit('notification', {
      type: 'notification',
      data: notification,
      timestamp: new Date().toISOString()
    });

    logger.info(`Notification sent to user: ${userId}`);
  }

  // Send notification to role-based group
  public static sendRoleNotification(role: string, notification: any): void {
    if (!this.io) return;

    this.io.to(`role:${role}`).emit('notification', {
      type: 'notification',
      data: notification,
      timestamp: new Date().toISOString()
    });

    logger.info(`Notification sent to role: ${role}`);
  }

  // Broadcast system maintenance notifications
  public static broadcastMaintenanceNotification(maintenance: any): void {
    if (!this.io) return;

    this.io.emit('maintenance:notification', {
      type: 'maintenance:notification',
      data: maintenance,
      timestamp: new Date().toISOString()
    });

    logger.info('Maintenance notification broadcasted');
  }

  // Get connected clients count
  public static getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  // Get connected clients info
  public static getConnectedClientsInfo(): any[] {
    return Array.from(this.connectedClients.values()).map(socket => ({
      id: socket.id,
      userId: socket.userId,
      username: socket.username,
      role: socket.role,
      connectedAt: socket.handshake.time
    }));
  }

  // Disconnect all clients (for maintenance)
  public static disconnectAllClients(reason: string = 'Server maintenance'): void {
    if (!this.io) return;

    this.io.emit('server:shutdown', {
      type: 'server:shutdown',
      message: reason,
      timestamp: new Date().toISOString()
    });

    setTimeout(() => {
      this.io.disconnectSockets(true);
      logger.info('All WebSocket clients disconnected');
    }, 5000); // Give clients 5 seconds to handle the shutdown message
  }
}
