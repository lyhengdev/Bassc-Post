import Notification from '../models/Notification.js';
import User from '../models/User.js';
import emailService from './emailService.js';

class NotificationService {
  constructor() {
    // Store connected Socket.io clients
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socketId
  }

  // Initialize with Socket.io instance
  setSocketIO(io) {
    this.io = io;
    console.log('✅ NotificationService: Socket.io instance set');
  }

  // Register user connection
  registerUser(userId, socketId) {
    this.connectedUsers.set(userId.toString(), socketId);
    console.log(`✅ NotificationService: User ${userId} registered with socket ${socketId}`);
  }

  // Unregister user connection
  unregisterUser(userId) {
    this.connectedUsers.delete(userId.toString());
    console.log(`✅ NotificationService: User ${userId} unregistered`);
  }

  // Send real-time notification via Socket.io using ROOMS
  sendRealTimeNotification(userId, notification) {
    if (!this.io) {
      console.warn('⚠️ NotificationService: Socket.io not initialized');
      return;
    }
    
    // Use room-based emission (more reliable than direct socketId)
    const roomName = `user:${userId.toString()}`;
    this.io.to(roomName).emit('notification', notification);
    console.log(`📤 Real-time notification sent to room ${roomName}`);
  }

  // Broadcast to all connected users (for announcements)
  broadcastNotification(notification) {
    if (!this.io) {
      console.warn('⚠️ NotificationService: Socket.io not initialized');
      return;
    }
    this.io.emit('notification', notification);
    console.log('📤 Broadcast notification sent to all users');
  }

  // Create and send notification
  async notify({
    recipientId,
    type,
    title,
    message,
    link,
    relatedArticle,
    relatedComment,
    relatedUser,
    priority = 'normal',
    metadata = {},
    sendEmail = false,
  }) {
    try {
      // Create notification in database
      const notification = await Notification.create({
        recipient: recipientId,
        type,
        title,
        message,
        link,
        relatedArticle,
        relatedComment,
        relatedUser,
        priority,
        metadata,
      });

      // Populate for real-time sending
      await notification.populate([
        { path: 'relatedArticle', select: 'title slug' },
        { path: 'relatedUser', select: 'firstName lastName avatar' },
      ]);

      // Send real-time notification
      this.sendRealTimeNotification(recipientId, notification);

      // Send email notification if requested
      if (sendEmail) {
        await this.sendEmailNotification(recipientId, notification);
      }

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Send email notification
  async sendEmailNotification(userId, notification) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.email) return;

      // Check user's email preferences (you can add this field to User model)
      // if (!user.emailNotifications) return;

      const emailContent = this.buildEmailContent(notification);
      
      // Use emailService.send instead of direct transporter
      await emailService.send({
        to: user.email,
        subject: notification.title,
        html: emailContent,
      });

      // Mark email as sent
      notification.emailSent = true;
      notification.emailSentAt = new Date();
      await notification.save();

      console.log(`📧 Email notification sent to ${user.email}`);
    } catch (error) {
      console.error('❌ Error sending email notification:', error);
    }
  }

  // Build email HTML content
  buildEmailContent(notification) {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const link = notification.link ? `${baseUrl}${notification.link}` : baseUrl;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${notification.title}</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Bassac Media</h1>
          </div>
          <div style="padding: 30px;">
            <h2 style="color: #1f2937; margin: 0 0 15px 0; font-size: 20px;">${notification.title}</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">${notification.message}</p>
            ${notification.link ? `
              <a href="${link}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-weight: 600;">View Details</a>
            ` : ''}
          </div>
          <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 14px; margin: 0;">You received this email because you have an account on Bassac Media.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Helper methods for common notification types
  async notifyArticlePublished(article, authorId) {
    return this.notify({
      recipientId: authorId,
      type: 'article_published',
      title: 'Your Article is Live! 🎉',
      message: `Your article "${article.title}" has been published and is now visible to readers.`,
      link: `/article/${article.slug}`,
      relatedArticle: article._id,
      sendEmail: true,
    });
  }

  async notifyArticleApproved(article, authorId) {
    return this.notify({
      recipientId: authorId,
      type: 'article_approved',
      title: 'Article Approved ✅',
      message: `Your article "${article.title}" has been approved by an editor.`,
      link: `/dashboard/articles/${article._id}`,
      relatedArticle: article._id,
      sendEmail: true,
    });
  }

  async notifyArticleRejected(article, authorId, reason) {
    return this.notify({
      recipientId: authorId,
      type: 'article_rejected',
      title: 'Article Needs Revision',
      message: `Your article "${article.title}" needs some changes. ${reason || 'Please review and resubmit.'}`,
      link: `/dashboard/articles/${article._id}/edit`,
      relatedArticle: article._id,
      metadata: { reason },
      sendEmail: true,
    });
  }

  async notifyCommentReceived(article, comment, authorId) {
    const commenterName = comment.author 
      ? `${comment.author.firstName} ${comment.author.lastName}` 
      : comment.guestName || 'Someone';
    
    return this.notify({
      recipientId: authorId,
      type: 'comment_received',
      title: 'New Comment on Your Article 💬',
      message: `${commenterName} commented on "${article.title}"`,
      link: `/article/${article.slug}#comments`,
      relatedArticle: article._id,
      relatedComment: comment._id,
      relatedUser: comment.author,
      sendEmail: true,
    });
  }

  async notifyCommentReply(parentComment, reply, recipientId) {
    const replierName = reply.author 
      ? `${reply.author.firstName} ${reply.author.lastName}` 
      : reply.guestName || 'Someone';
    
    return this.notify({
      recipientId,
      type: 'comment_reply',
      title: 'New Reply to Your Comment',
      message: `${replierName} replied to your comment`,
      link: `/article/${parentComment.article.slug}#comment-${reply._id}`,
      relatedComment: reply._id,
      relatedUser: reply.author,
      sendEmail: true,
    });
  }

  async notifyCommentApproved(comment, userId) {
    return this.notify({
      recipientId: userId,
      type: 'comment_approved',
      title: 'Comment Approved ✅',
      message: 'Your comment has been approved and is now visible.',
      relatedComment: comment._id,
    });
  }

  async notifyRoleChanged(userId, newRole, changedBy) {
    return this.notify({
      recipientId: userId,
      type: 'role_changed',
      title: 'Your Role Has Been Updated',
      message: `Your account role has been changed to ${newRole}.`,
      link: '/dashboard',
      relatedUser: changedBy,
      priority: 'high',
      sendEmail: true,
    });
  }

  async notifyNewSubscriber(subscriberEmail, adminIds) {
    for (const adminId of adminIds) {
      await this.notify({
        recipientId: adminId,
        type: 'newsletter_subscribed',
        title: 'New Newsletter Subscriber',
        message: `${subscriberEmail} has subscribed to the newsletter.`,
        link: '/dashboard/newsletter',
      });
    }
  }

  async notifyContactMessage(message, adminIds) {
    for (const adminId of adminIds) {
      await this.notify({
        recipientId: adminId,
        type: 'contact_message',
        title: 'New Contact Message',
        message: `${message.name} sent a message: "${message.subject}"`,
        link: '/dashboard/messages',
        priority: 'high',
        sendEmail: true,
      });
    }
  }

  async notifySystemAnnouncement(title, message, userIds) {
    const notifications = [];
    for (const userId of userIds) {
      const notification = await this.notify({
        recipientId: userId,
        type: 'system_announcement',
        title,
        message,
        priority: 'high',
        sendEmail: true,
      });
      notifications.push(notification);
    }
    return notifications;
  }
}

// Export singleton instance
const notificationService = new NotificationService();
export default notificationService;
