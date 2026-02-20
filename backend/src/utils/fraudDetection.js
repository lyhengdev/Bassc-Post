import crypto from 'crypto';
import config from '../config/index.js';
import AdEvent from '../models/AdEvent.js';

/**
 * Get client IP address from request
 * Handles various proxy headers
 */
export const getClientIp = (req) => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    ''
  );
};

/**
 * Hash IP address for privacy-preserving storage
 * Uses configurable salt from environment
 */
export const hashIp = (ip) => {
  const salt = process.env.IP_HASH_SALT || 'default-salt-change-me';
  return crypto
    .createHash('sha256')
    .update(ip + salt)
    .digest('hex')
    .slice(0, 16);
};

/**
 * Detect potential click fraud
 * Returns true if suspicious activity detected
 */
export const detectClickFraud = async (adId, sessionId, ipHash) => {
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

  try {
    // Check for rapid clicks from same session or IP
    const recentClicks = await AdEvent.countDocuments({
      adId,
      type: 'click',
      $or: [{ sessionId }, { ipHash }],
      createdAt: { $gte: oneMinuteAgo },
    });

    // Flag as fraud if more than 5 clicks per minute
    if (recentClicks > 5) {
      return {
        isFraud: true,
        reason: 'Too many clicks from same source',
        count: recentClicks,
      };
    }

    // Check for rapid impressions followed by clicks (bot behavior)
    const recentImpressions = await AdEvent.countDocuments({
      adId,
      type: 'impression',
      sessionId,
      createdAt: { $gte: oneMinuteAgo },
    });

    // If clicks > impressions, likely fraud
    if (recentClicks > recentImpressions) {
      return {
        isFraud: true,
        reason: 'More clicks than impressions',
        clicks: recentClicks,
        impressions: recentImpressions,
      };
    }

    return { isFraud: false };
  } catch (error) {
    console.error('Fraud detection error:', error);
    // Don't block request on detection errors
    return { isFraud: false };
  }
};

/**
 * Detect impression fraud (bot-generated impressions)
 */
export const detectImpressionFraud = async (adId, sessionId, ipHash) => {
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

  try {
    // Check for rapid impressions from same source
    const recentImpressions = await AdEvent.countDocuments({
      adId,
      type: 'impression',
      $or: [{ sessionId }, { ipHash }],
      createdAt: { $gte: oneMinuteAgo },
    });

    // Flag if more than 10 impressions per minute (likely bot)
    if (recentImpressions > 10) {
      return {
        isFraud: true,
        reason: 'Too many impressions from same source',
        count: recentImpressions,
      };
    }

    return { isFraud: false };
  } catch (error) {
    console.error('Fraud detection error:', error);
    return { isFraud: false };
  }
};

/**
 * Get fraud statistics for an ad
 */
export const getAdFraudStats = async (adId, days = 7) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const stats = await AdEvent.aggregate([
    {
      $match: {
        adId,
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          type: '$type',
          ipHash: '$ipHash',
          sessionId: '$sessionId',
        },
        count: { $sum: 1 },
      },
    },
    {
      $match: {
        count: { $gt: 50 }, // Suspicious if > 50 events from single source
      },
    },
    {
      $group: {
        _id: '$_id.type',
        suspiciousSources: { $sum: 1 },
        totalEvents: { $sum: '$count' },
      },
    },
  ]);

  return stats;
};

export default {
  getClientIp,
  hashIp,
  detectClickFraud,
  detectImpressionFraud,
  getAdFraudStats,
};
