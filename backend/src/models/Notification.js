import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  // Who receives the notification
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  // Type of notification
  type: {
    type: String,
    enum: [
      'article_published',      // Your article was published
      'article_approved',       // Your article was approved
      'article_rejected',       // Your article was rejected
      'article_submitted',      // New article submitted for review
      'comment_received',       // Someone commented on your article
      'comment_reply',          // Someone replied to your comment
      'comment_approved',       // Your comment was approved
      'comment_rejected',       // Your comment was rejected
      'user_mentioned',         // You were mentioned
      'new_follower',           // Someone followed you (future)
      'role_changed',           // Your role was changed
      'system_announcement',    // System-wide announcement
      'newsletter_subscribed',  // New newsletter subscriber (admin)
      'contact_message',        // New contact message (admin)
    ],
    required: true,
  },
  
  // Notification content
  title: {
    type: String,
    required: true,
    trim: true,
  },
  
  message: {
    type: String,
    required: true,
    trim: true,
  },
  
  // Link to related content
  link: {
    type: String,
    trim: true,
  },
  
  // Related entities
  relatedArticle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Article',
  },
  
  relatedComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
  },
  
  relatedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  
  // Status
  isRead: {
    type: Boolean,
    default: false,
    index: true,
  },
  
  readAt: {
    type: Date,
  },
  
  // Email notification sent
  emailSent: {
    type: Boolean,
    default: false,
  },
  
  emailSentAt: {
    type: Date,
  },
  
  // Push notification sent (for browser)
  pushSent: {
    type: Boolean,
    default: false,
  },
  
  // Priority
  priority: {
    type: String,
    enum: ['low', 'normal', 'high'],
    default: 'normal',
  },
  
  // Metadata for additional info
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
  
}, {
  timestamps: true,
});

// Indexes for efficient querying
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });

// Virtual for time ago
notificationSchema.virtual('timeAgo').get(function() {
  const seconds = Math.floor((new Date() - this.createdAt) / 1000);
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  };
  
  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
    }
  }
  return 'Just now';
});

// Static method to create notification
notificationSchema.statics.createNotification = async function(data) {
  const notification = await this.create(data);
  return notification;
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({ recipient: userId, isRead: false });
};

// Static method to mark all as read
notificationSchema.statics.markAllAsRead = async function(userId) {
  return this.updateMany(
    { recipient: userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
};

// Instance method to mark as read
notificationSchema.methods.markAsRead = async function() {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    await this.save();
  }
  return this;
};

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
