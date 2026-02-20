import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateObjectId } from '../middleware/validation.js';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  getPreferences,
  updatePreferences,
  sendAnnouncement,
  sendTestNotification,
} from '../controllers/notificationController.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// User notification routes
router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.get('/preferences', getPreferences);
router.put('/preferences', updatePreferences);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', validateObjectId(), markAsRead);
router.delete('/all', deleteAllNotifications);
router.delete('/:id', validateObjectId(), deleteNotification);

// Admin routes
router.post('/announce', authorize('admin'), sendAnnouncement);
router.post('/test', sendTestNotification);

export default router;
