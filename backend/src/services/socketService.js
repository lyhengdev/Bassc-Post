import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

/**
 * Socket.IO Real-Time Server
 * 
 * Handles:
 * - Real-time notifications
 * - Breaking news alerts
 * - Live user presence
 * - Chat/comments (optional)
 */

class SocketService {
  constructor() {
    this.io = null;
    this.users = new Map(); // userId -> socketId mapping
  }

  /**
   * Initialize Socket.IO server
   */
  initialize(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        credentials: true,
        methods: ['GET', 'POST'],
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          // Allow anonymous connections for public features
          socket.userId = null;
          socket.isAuthenticated = false;
          return next();
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.userId;
        socket.isAuthenticated = true;
        socket.userRole = decoded.role;

        next();
      } catch (error) {
        console.error('Socket auth error:', error);
        next(new Error('Authentication failed'));
      }
    });

    // Connection handler
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    console.log('✅ Socket.IO server initialized');
    return this.io;
  }

  /**
   * Handle new socket connection
   */
  handleConnection(socket) {
    console.log(`Socket connected: ${socket.id} (User: ${socket.userId || 'anonymous'})`);

    // Store user socket mapping
    if (socket.userId) {
      this.users.set(socket.userId, socket.id);
    }

    // Join user's personal room
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    // Join public rooms
    socket.join('public');

    // Send initial data
    socket.emit('connected', {
      socketId: socket.id,
      userId: socket.userId,
      timestamp: new Date().toISOString(),
    });

    // ==================== EVENT HANDLERS ====================

    // User presence
    socket.on('user:online', () => {
      if (socket.userId) {
        this.broadcastUserOnline(socket.userId);
      }
    });

    // Typing indicator
    socket.on('typing:start', (data) => {
      socket.to(data.room).emit('user:typing', {
        userId: socket.userId,
        room: data.room,
      });
    });

    socket.on('typing:stop', (data) => {
      socket.to(data.room).emit('user:stopped-typing', {
        userId: socket.userId,
        room: data.room,
      });
    });

    // Join/leave rooms
    socket.on('room:join', (roomId) => {
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room: ${roomId}`);
    });

    socket.on('room:leave', (roomId) => {
      socket.leave(roomId);
      console.log(`Socket ${socket.id} left room: ${roomId}`);
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      
      if (socket.userId) {
        this.users.delete(socket.userId);
        this.broadcastUserOffline(socket.userId);
      }
    });

    // Error handler
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  /**
   * Send notification to specific user
   */
  sendToUser(userId, event, data) {
    const socketId = this.users.get(userId);
    
    if (socketId) {
      this.io.to(socketId).emit(event, data);
      return true;
    }
    
    return false;
  }

  /**
   * Send notification to multiple users
   */
  sendToUsers(userIds, event, data) {
    let sentCount = 0;
    
    userIds.forEach(userId => {
      if (this.sendToUser(userId, event, data)) {
        sentCount++;
      }
    });
    
    return sentCount;
  }

  /**
   * Broadcast to all connected users
   */
  broadcast(event, data) {
    this.io.emit(event, data);
  }

  /**
   * Broadcast to room
   */
  broadcastToRoom(room, event, data) {
    this.io.to(room).emit(event, data);
  }

  /**
   * Send notification to user
   */
  sendNotification(userId, notification) {
    return this.sendToUser(userId, 'notification', notification);
  }

  /**
   * Send breaking news to all users
   */
  sendBreakingNews(news) {
    this.io.to('public').emit('breaking-news', {
      ...news,
      timestamp: new Date().toISOString(),
    });
    
    console.log('Breaking news sent to all users');
  }

  /**
   * Send article update
   */
  sendArticleUpdate(articleId, update) {
    this.broadcastToRoom('public', 'article:update', {
      articleId,
      ...update,
    });
  }

  /**
   * Send comment notification
   */
  sendCommentNotification(userId, comment) {
    return this.sendToUser(userId, 'comment:new', comment);
  }

  /**
   * Broadcast user online status
   */
  broadcastUserOnline(userId) {
    this.broadcast('user:online', { userId });
  }

  /**
   * Broadcast user offline status
   */
  broadcastUserOffline(userId) {
    this.broadcast('user:offline', { userId });
  }

  /**
   * Get online users count
   */
  getOnlineCount() {
    return this.users.size;
  }

  /**
   * Get online users
   */
  getOnlineUsers() {
    return Array.from(this.users.keys());
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId) {
    return this.users.has(userId);
  }

  /**
   * Get server statistics
   */
  getStats() {
    return {
      connectedSockets: this.io.sockets.sockets.size,
      onlineUsers: this.users.size,
      rooms: Array.from(this.io.sockets.adapter.rooms.keys()),
    };
  }

  /**
   * Disconnect all sockets
   */
  disconnectAll() {
    this.io.disconnectSockets();
  }

  /**
   * Close server
   */
  close() {
    if (this.io) {
      this.disconnectAll();
      this.io.close();
      this.users.clear();
      console.log('Socket.IO server closed');
    }
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
