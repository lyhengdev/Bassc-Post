import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import notificationService from '../services/notificationService.js';

export function setupSocketIO(server) {
  const io = new Server(server, {
    cors: {
      origin: config.frontendUrl || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Set Socket.io instance in notification service
  notificationService.setSocketIO(io);

  // Authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, config.jwt.secret);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (error) {
      // Give specific error message based on error type
      if (error.name === 'TokenExpiredError') {
        console.warn('Socket auth: Token expired for connection attempt');
        return next(new Error('jwt expired'));
      }
      if (error.name === 'JsonWebTokenError') {
        console.warn('Socket auth: Invalid token');
        return next(new Error('Invalid token'));
      }
      console.error('Socket authentication error:', error.message);
      next(new Error('Authentication failed'));
    }
  });

  // Handle connections
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (User: ${socket.userId})`);
    
    // Register user with notification service
    notificationService.registerUser(socket.userId, socket.id);

    // Join user-specific room
    socket.join(`user:${socket.userId}`);

    // Join role-based rooms for broadcasts
    socket.join(`role:${socket.userRole}`);

    // Handle request for unread count
    socket.on('get:unread-count', async () => {
      try {
        const Notification = (await import('../models/Notification.js')).default;
        const count = await Notification.getUnreadCount(socket.userId);
        socket.emit('unread-count', { count });
      } catch (error) {
        console.error('Error getting unread count:', error);
      }
    });

    // Handle mark as read
    socket.on('mark:read', async (notificationId) => {
      try {
        const Notification = (await import('../models/Notification.js')).default;
        await Notification.findByIdAndUpdate(notificationId, {
          isRead: true,
          readAt: new Date(),
        });
        socket.emit('notification:read', { id: notificationId });
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    });

    // Handle mark all as read
    socket.on('mark:all-read', async () => {
      try {
        const Notification = (await import('../models/Notification.js')).default;
        await Notification.markAllAsRead(socket.userId);
        socket.emit('all-read');
      } catch (error) {
        console.error('Error marking all as read:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${socket.id} (Reason: ${reason})`);
      notificationService.unregisterUser(socket.userId);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.userId}:`, error);
    });
  });

  // Utility function to send notification to specific user
  io.sendToUser = (userId, event, data) => {
    io.to(`user:${userId}`).emit(event, data);
  };

  // Utility function to send to users with specific role
  io.sendToRole = (role, event, data) => {
    io.to(`role:${role}`).emit(event, data);
  };

  // Utility function to broadcast to all connected users
  io.broadcast = (event, data) => {
    io.emit(event, data);
  };

  console.log('Socket.io initialized for real-time notifications');
  
  return io;
}

export default setupSocketIO;
