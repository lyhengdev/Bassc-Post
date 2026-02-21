import { ContactMessage } from '../models/Analytics.js';
import User from '../models/User.js';
import emailService from '../services/emailService.js';
import notificationService from '../services/notificationService.js';
import { getClientIp, parsePaginationParams } from '../utils/helpers.js';
import {
  successResponse,
  createdResponse,
  paginatedResponse,
  notFoundResponse,
  badRequestResponse,
} from '../utils/apiResponse.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * Submit contact form (public)
 * POST /api/contact
 */
export const submitContact = asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.body;

  const contact = await ContactMessage.create({
    name,
    email,
    subject,
    message,
    ipAddress: getClientIp(req),
  });

  // Send email notification to admin
  try {
    await emailService.sendContactNotification(contact);
  } catch (error) {
    console.error('Failed to send contact notification email:', error);
  }

  // Send real-time notification to all admins
  try {
    const admins = await User.find({ role: 'admin' }).select('_id');
    const adminIds = admins.map(a => a._id);
    await notificationService.notifyContactMessage(contact, adminIds);
  } catch (error) {
    console.error('Failed to send contact notification:', error);
  }

  return createdResponse(
    res,
    { id: contact._id },
    'Your message has been sent. We will get back to you soon.'
  );
});

/**
 * Get all contact messages (admin)
 * GET /api/contact
 */
export const getContactMessages = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaginationParams(req.query);
  const { status } = req.query;

  const filter = {};
  if (status) filter.status = status;

  const [messages, total] = await Promise.all([
    ContactMessage.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    ContactMessage.countDocuments(filter),
  ]);

  return paginatedResponse(res, messages, { page, limit, total });
});

/**
 * Get contact message by ID (admin)
 * GET /api/contact/:id
 */
export const getContactMessage = asyncHandler(async (req, res) => {
  const message = await ContactMessage.findById(req.params.id)
    .populate('repliedBy', 'firstName lastName');

  if (!message) {
    return notFoundResponse(res, 'Message not found');
  }

  // Mark as read if new
  if (message.status === 'new') {
    message.status = 'read';
    await message.save();
  }

  return successResponse(res, { message });
});

/**
 * Update contact message status (admin)
 * PUT /api/contact/:id
 */
export const updateContactMessage = asyncHandler(async (req, res) => {
  const message = await ContactMessage.findById(req.params.id);

  if (!message) {
    return notFoundResponse(res, 'Message not found');
  }

  const { status } = req.body;

  if (status) {
    if (!['new', 'read', 'replied', 'archived'].includes(status)) {
      return badRequestResponse(res, 'Invalid status');
    }
    message.status = status;
  }

  await message.save();

  return successResponse(res, { message }, 'Message updated');
});

/**
 * Reply to contact message (admin)
 * POST /api/contact/:id/reply
 */
export const replyToContact = asyncHandler(async (req, res) => {
  const message = await ContactMessage.findById(req.params.id);

  if (!message) {
    return notFoundResponse(res, 'Message not found');
  }

  const { reply } = req.body;

  if (!reply || reply.trim().length === 0) {
    return badRequestResponse(res, 'Reply message is required');
  }

  // Send reply email with proper error handling
  try {
    await emailService.send({
      to: message.email,
      subject: `Re: ${message.subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Reply from Bassac Post</h2>
          <p>Dear ${message.name},</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            ${reply.replace(/\n/g, '<br>')}
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            This is in response to your message:<br>
            <em>"${message.message.substring(0, 200)}${message.message.length > 200 ? '...' : ''}"</em>
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send reply email:', error);
    return badRequestResponse(res, 'Failed to send email. Please try again.');
  }

  message.status = 'replied';
  message.repliedBy = req.user._id;
  message.repliedAt = new Date();
  message.replyMessage = reply;
  await message.save();

  return successResponse(res, { message }, 'Reply sent successfully');
});

/**
 * Delete contact message (admin)
 * DELETE /api/contact/:id
 */
export const deleteContactMessage = asyncHandler(async (req, res) => {
  const message = await ContactMessage.findById(req.params.id);

  if (!message) {
    return notFoundResponse(res, 'Message not found');
  }

  await message.deleteOne();

  return successResponse(res, null, 'Message deleted');
});

/**
 * Get contact stats (admin)
 * GET /api/contact/stats
 */
export const getContactStats = asyncHandler(async (req, res) => {
  const [statusBreakdown, recent] = await Promise.all([
    ContactMessage.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    ContactMessage.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    }),
  ]);

  return successResponse(res, {
    byStatus: Object.fromEntries(statusBreakdown.map((s) => [s._id, s.count])),
    last24Hours: recent,
    newCount: statusBreakdown.find((s) => s._id === 'new')?.count || 0,
  });
});

export default {
  submitContact,
  getContactMessages,
  getContactMessage,
  updateContactMessage,
  replyToContact,
  deleteContactMessage,
  getContactStats,
};
