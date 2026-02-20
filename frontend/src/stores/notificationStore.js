import { create } from 'zustand';
import { io } from 'socket.io-client';
import api from '../services/api';
import { resolveNotificationLink } from '../utils/notificationLink';

// In development, socket.io goes through Vite proxy (same origin)
// In production, use VITE_SOCKET_URL or VITE_API_URL
const getSocketUrl = () => {
  // If explicit socket URL is set, use it
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl && apiUrl.startsWith('http')) {
    return new URL(apiUrl).origin;
  }

  // In development, default to backend port to avoid Vite proxy socket errors
  if (import.meta.env.DEV) {
    return 'http://localhost:8888';
  }
  
  // In production, derive from API URL or use default
  if (apiUrl) {
    return window.location.origin;
  }
  
  return window.location.origin;
};

const useNotificationStore = create((set, get) => ({
  // State
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
  socket: null,
  isConnected: false,
  
  // Browser notification permission
  browserPermission: 'default',

  // Initialize socket connection
  initSocket: (token) => {
    const { socket } = get();
    
    // Don't create new socket if one exists and connected
    if (socket?.connected) return;
    
    // Disconnect existing socket if any
    if (socket) {
      socket.disconnect();
    }

    const socketUrl = getSocketUrl();
    console.log('🔌 Connecting to socket at:', socketUrl);
    
    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
      set({ isConnected: true });
      // Get initial unread count
      newSocket.emit('get:unread-count');
    });

    newSocket.on('disconnect', (reason) => {
      console.log('⚠️ Socket disconnected:', reason);
      set({ isConnected: false });
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
      set({ isConnected: false });
      
      // If JWT expired, don't keep retrying - user needs to re-login
      const message = (error.message || '').toLowerCase();
      if (
        message.includes('jwt expired') ||
        message.includes('authentication') ||
        message.includes('invalid token') ||
        message.includes('token')
      ) {
        console.log('🔑 Token expired, stopping socket reconnection');
        newSocket.disconnect();
      }
    });

    // Handle incoming notifications
    newSocket.on('notification', (notification) => {
      console.log('📬 New notification received:', notification.title);
      set((state) => ({
        notifications: [notification, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      }));

      // Show browser notification
      get().showBrowserNotification(notification);
      
      // Play notification sound
      get().playNotificationSound();
    });

    // Handle unread count update
    newSocket.on('unread-count', ({ count }) => {
      console.log('📊 Unread count updated:', count);
      set({ unreadCount: count });
    });

    // Handle notification read
    newSocket.on('notification:read', ({ id }) => {
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n._id === id ? { ...n, isRead: true } : n
        ),
      }));
    });

    // Handle all read
    newSocket.on('all-read', () => {
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));
    });

    set({ socket: newSocket });
  },

  // Disconnect socket
  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  // Fetch notifications from API
  fetchNotifications: async (page = 1, unreadOnly = false) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/notifications', {
        params: { page, limit: 20, unreadOnly },
      });
      
      if (page === 1) {
        set({
          notifications: response.data.data.notifications,
          unreadCount: response.data.data.unreadCount,
          isLoading: false,
        });
      } else {
        set((state) => ({
          notifications: [...state.notifications, ...response.data.data.notifications],
          isLoading: false,
        }));
      }
      
      return response.data.data;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Mark notification as read
  markAsRead: async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n._id === id ? { ...n, isRead: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));

      // Also notify via socket
      const { socket } = get();
      socket?.emit('mark:read', id);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  },

  // Mark all as read
  markAllAsRead: async () => {
    try {
      await api.put('/notifications/read-all');
      
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));

      // Also notify via socket
      const { socket } = get();
      socket?.emit('mark:all-read');
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  },

  // Delete notification
  deleteNotification: async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      
      set((state) => ({
        notifications: state.notifications.filter((n) => n._id !== id),
        unreadCount: state.notifications.find((n) => n._id === id && !n.isRead)
          ? state.unreadCount - 1
          : state.unreadCount,
      }));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  },

  // Delete all notifications
  deleteAllNotifications: async () => {
    try {
      await api.delete('/notifications/all');
      set({ notifications: [], unreadCount: 0 });
    } catch (error) {
      console.error('Error deleting all notifications:', error);
    }
  },

  // Request browser notification permission
  requestBrowserPermission: async () => {
    if (!('Notification' in window)) {
      console.log('Browser does not support notifications');
      return false;
    }

    const permission = await Notification.requestPermission();
    set({ browserPermission: permission });
    return permission === 'granted';
  },

  // Show browser notification
  showBrowserNotification: (notification) => {
    const { browserPermission } = get();
    
    if (browserPermission !== 'granted') return;
    if (!('Notification' in window)) return;

    try {
      const browserNotif = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon-32x32.png',
        tag: notification._id,
        requireInteraction: notification.priority === 'high',
      });

      browserNotif.onclick = () => {
        window.focus();
        const resolvedLink = resolveNotificationLink(notification);
        if (resolvedLink) window.location.href = resolvedLink;
        browserNotif.close();
      };

      // Auto close after 5 seconds for normal priority
      if (notification.priority !== 'high') {
        setTimeout(() => browserNotif.close(), 5000);
      }
    } catch (error) {
      console.error('Error showing browser notification:', error);
    }
  },

  // Play notification sound
  playNotificationSound: () => {
    try {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.1;

      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
      }, 150);
    } catch (error) {
      // Silently fail if audio context is not available
    }
  },

  // Clear state
  clearNotifications: () => {
    set({
      notifications: [],
      unreadCount: 0,
      error: null,
    });
  },
}));

export default useNotificationStore;
