import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { successResponse, notFoundResponse, badRequestResponse } from '../utils/apiResponse.js';
import notificationService from '../services/notificationService.js';

/**
 * Get user's notifications
 * GET /api/notifications
 */
export const getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly = 'false' } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const query = { recipient: req.user._id };
  if (unreadOnly === 'true') {
    query.isRead = false;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query)
      .populate('relatedArticle', 'title slug featuredImage')
      .populate('relatedUser', 'firstName lastName avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Notification.countDocuments(query),
    Notification.countDocuments({ recipient: req.user._id, isRead: false }),
  ]);

  return successResponse(res, {
    notifications,
    unreadCount,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

/**
 * Get unread notification count
 * GET /api/notifications/unread-count
 */
export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.getUnreadCount(req.user._id);
  return successResponse(res, { count });
});

/**
 * Mark notification as read
 * PUT /api/notifications/:id/read
 */
export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    recipient: req.user._id,
  });

  if (!notification) {
    return notFoundResponse(res, 'Notification not found');
  }

  await notification.markAsRead();

  return successResponse(res, { notification }, 'Notification marked as read');
});

/**
 * Mark all notifications as read
 * PUT /api/notifications/read-all
 */
export const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.markAllAsRead(req.user._id);
  return successResponse(res, null, 'All notifications marked as read');
});

/**
 * Delete a notification
 * DELETE /api/notifications/:id
 */
export const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    recipient: req.user._id,
  });

  if (!notification) {
    return notFoundResponse(res, 'Notification not found');
  }

  return successResponse(res, null, 'Notification deleted');
});

/**
 * Delete all notifications
 * DELETE /api/notifications/all
 */
export const deleteAllNotifications = asyncHandler(async (req, res) => {
  await Notification.deleteMany({ recipient: req.user._id });
  return successResponse(res, null, 'All notifications deleted');
});

/**
 * Get notification preferences
 * GET /api/notifications/preferences
 */
export const getPreferences = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('notificationPreferences');
  
  const defaultPreferences = {
    email: {
      articlePublished: true,
      articleApproved: true,
      articleRejected: true,
      commentReceived: true,
      commentReply: true,
      systemAnnouncement: true,
    },
    push: {
      articlePublished: true,
      articleApproved: true,
      articleRejected: true,
      commentReceived: true,
      commentReply: true,
      systemAnnouncement: true,
    },
  };

  return successResponse(res, {
    preferences: user.notificationPreferences || defaultPreferences,
  });
});

/**
 * Update notification preferences
 * PUT /api/notifications/preferences
 */
export const updatePreferences = asyncHandler(async (req, res) => {
  const { preferences } = req.body;

  await User.findByIdAndUpdate(req.user._id, {
    notificationPreferences: preferences,
  });

  return successResponse(res, { preferences }, 'Preferences updated');
});

/**
 * Send system announcement (Admin only)
 * POST /api/notifications/announce
 */
export const sendAnnouncement = asyncHandler(async (req, res) => {
  const { title, message, targetRoles = ['user', 'writer', 'editor', 'admin'] } = req.body;

  if (!title || !message) {
    return badRequestResponse(res, 'Title and message are required');
  }

  // Get all users with the target roles
  const users = await User.find({ role: { $in: targetRoles } }).select('_id');
  const userIds = users.map(u => u._id);

  // Send notifications
  await notificationService.notifySystemAnnouncement(title, message, userIds);

  return successResponse(res, { 
    sentTo: userIds.length 
  }, `Announcement sent to ${userIds.length} users`);
});

/**
 * Test notification (for development)
 * POST /api/notifications/test
 */
export const sendTestNotification = asyncHandler(async (req, res) => {
  const notification = await notificationService.notify({
    recipientId: req.user._id,
    type: 'system_announcement',
    title: 'Test Notification 🔔',
    message: 'This is a test notification. If you see this, notifications are working!',
    link: '/dashboard',
    priority: 'normal',
  });

  return successResponse(res, { notification }, 'Test notification sent');
});
