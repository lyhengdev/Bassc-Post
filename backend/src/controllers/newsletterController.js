import Newsletter from '../models/Newsletter.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { successResponse, badRequestResponse, notFoundResponse } from '../utils/apiResponse.js';
import emailService from '../services/emailService.js';
import config from '../config/index.js';

/**
 * Subscribe to newsletter
 * POST /api/newsletter/subscribe
 */
export const subscribe = asyncHandler(async (req, res) => {
  const { email, name, source = 'website' } = req.body;

  if (!email) {
    return badRequestResponse(res, 'Email is required');
  }

  // Validate email format
  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(email)) {
    return badRequestResponse(res, 'Please enter a valid email address');
  }

  // Check if already subscribed
  const existing = await Newsletter.findOne({ email });
  
  if (existing) {
    if (existing.status === 'confirmed') {
      return successResponse(res, null, 'You are already subscribed!');
    }
    if (existing.status === 'pending') {
      // Resend confirmation email
      const subscriberWithToken = await Newsletter.findById(existing._id).select('+confirmToken');
      
      // Send confirmation email
      try {
        await emailService.send({
          to: email,
          subject: 'Confirm your newsletter subscription',
          html: `
            <h1>Confirm Your Subscription</h1>
            <p>Thank you for subscribing to our newsletter!</p>
            <p>Please click the link below to confirm your subscription:</p>
            <a href="${config.frontendUrl}/newsletter/confirm?token=${subscriberWithToken.confirmToken}">Confirm Subscription</a>
            <p>If you didn't subscribe, you can ignore this email.</p>
          `,
        });
      } catch (error) {
        console.error('Failed to send confirmation email:', error);
      }
      
      return successResponse(res, null, 'Confirmation email resent. Please check your inbox.');
    }
    if (existing.status === 'unsubscribed') {
      // Resubscribe - update status and generate new tokens
      existing.status = 'pending';
      existing.unsubscribedAt = null;
      existing.name = name || existing.name;
      await existing.save();
      
      // Get new token
      const subscriberWithToken = await Newsletter.findById(existing._id).select('+confirmToken');
      
      // Send confirmation email for resubscribe
      try {
        await emailService.send({
          to: email,
          subject: 'Confirm your newsletter subscription',
          html: `
            <h1>Welcome Back!</h1>
            <p>Thank you for subscribing again to our newsletter!</p>
            <p>Please click the link below to confirm your subscription:</p>
            <a href="${config.frontendUrl}/newsletter/confirm?token=${subscriberWithToken.confirmToken}">Confirm Subscription</a>
            <p>If you didn't subscribe, you can ignore this email.</p>
          `,
        });
      } catch (error) {
        console.error('Failed to send confirmation email:', error);
      }
      
      return successResponse(res, null, 'Welcome back! Please check your email to confirm.', 201);
    }
  }

  // Create new subscriber
  const subscriber = await Newsletter.create({
    email,
    name,
    source,
    ipAddress: req.ip,
  });

  // Get the confirm token
  const subscriberWithToken = await Newsletter.findById(subscriber._id).select('+confirmToken');

  // Send confirmation email
  try {
    await emailService.send({
      to: email,
      subject: 'Confirm your newsletter subscription',
      html: `
        <h1>Welcome to Our Newsletter!</h1>
        <p>Thank you for subscribing!</p>
        <p>Please click the link below to confirm your subscription:</p>
        <a href="${config.frontendUrl}/newsletter/confirm?token=${subscriberWithToken.confirmToken}">Confirm Subscription</a>
        <p>If you didn't subscribe, you can ignore this email.</p>
      `,
    });
  } catch (error) {
    console.error('Failed to send confirmation email:', error);
  }

  return successResponse(res, null, 'Thank you for subscribing! Please check your email to confirm.', 201);
});

/**
 * Confirm subscription
 * POST /api/newsletter/confirm
 */
export const confirmSubscription = asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return badRequestResponse(res, 'Confirmation token is required');
  }

  const subscriber = await Newsletter.findOne({ confirmToken: token }).select('+confirmToken');

  if (!subscriber) {
    return notFoundResponse(res, 'Invalid or expired confirmation link');
  }

  if (subscriber.status === 'confirmed') {
    return successResponse(res, null, 'Your subscription is already confirmed!');
  }

  subscriber.status = 'confirmed';
  subscriber.confirmedAt = new Date();
  await subscriber.save();

  return successResponse(res, null, 'Your subscription has been confirmed!');
});

/**
 * Unsubscribe from newsletter
 * POST /api/newsletter/unsubscribe
 */
export const unsubscribe = asyncHandler(async (req, res) => {
  const { token, email } = req.body;

  let subscriber;

  if (token) {
    subscriber = await Newsletter.findOne({ unsubscribeToken: token }).select('+unsubscribeToken');
  } else if (email) {
    subscriber = await Newsletter.findOne({ email });
  }

  if (!subscriber) {
    return notFoundResponse(res, 'Subscriber not found');
  }

  subscriber.status = 'unsubscribed';
  subscriber.unsubscribedAt = new Date();
  await subscriber.save();

  return successResponse(res, null, 'You have been unsubscribed successfully');
});

/**
 * Update preferences
 * PUT /api/newsletter/preferences
 */
export const updatePreferences = asyncHandler(async (req, res) => {
  const { token, email, preferences } = req.body;

  let subscriber;

  if (token) {
    subscriber = await Newsletter.findOne({ unsubscribeToken: token }).select('+unsubscribeToken');
  } else if (email) {
    subscriber = await Newsletter.findOne({ email });
  }

  if (!subscriber) {
    return notFoundResponse(res, 'Subscriber not found');
  }

  if (preferences) {
    subscriber.preferences = { ...subscriber.preferences, ...preferences };
    await subscriber.save();
  }

  return successResponse(res, { preferences: subscriber.preferences }, 'Preferences updated');
});

// ==================== ADMIN ROUTES ====================

/**
 * Get all subscribers (admin)
 * GET /api/newsletter
 */
export const getAllSubscribers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;
  const skip = (page - 1) * limit;

  const filter = {};
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { email: { $regex: search, $options: 'i' } },
      { name: { $regex: search, $options: 'i' } },
    ];
  }

  const subscribers = await Newsletter.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Newsletter.countDocuments(filter);
  const stats = await Newsletter.getStats();

  return successResponse(res, {
    subscribers,
    stats,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * Delete subscriber (admin)
 * DELETE /api/newsletter/:id
 */
export const deleteSubscriber = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const subscriber = await Newsletter.findByIdAndDelete(id);

  if (!subscriber) {
    return notFoundResponse(res, 'Subscriber not found');
  }

  return successResponse(res, null, 'Subscriber deleted');
});

/**
 * Export subscribers (admin)
 * GET /api/newsletter/export
 */
export const exportSubscribers = asyncHandler(async (req, res) => {
  const { status } = req.query;

  const filter = {};
  if (status) filter.status = status;

  const subscribers = await Newsletter.find(filter).select('email name status createdAt confirmedAt');

  // Generate CSV
  const csv = [
    'Email,Name,Status,Subscribed At,Confirmed At',
    ...subscribers.map(
      (s) =>
        `${s.email},"${s.name || ''}",${s.status},${s.createdAt.toISOString()},${s.confirmedAt ? s.confirmedAt.toISOString() : ''}`
    ),
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=newsletter-subscribers.csv');
  res.send(csv);
});

export default {
  subscribe,
  confirmSubscription,
  unsubscribe,
  updatePreferences,
  getAllSubscribers,
  deleteSubscriber,
  exportSubscribers,
};
