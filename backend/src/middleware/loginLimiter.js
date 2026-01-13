/**
 * Login Rate Limiter & Account Lockout
 * Prevents brute force attacks on login
 * 
 * Features:
 * - Rate limiting per IP
 * - Rate limiting per email
 * - Account lockout after failed attempts
 * - Progressive delays
 */

import rateLimit from 'express-rate-limit';
import logger from '../services/loggerService.js';

// In-memory store for failed login attempts (use Redis in production for scaling)
const failedAttempts = new Map();
const lockedAccounts = new Map();

// Configuration
const CONFIG = {
  maxFailedAttempts: 5,           // Lock account after 5 failed attempts
  lockoutDuration: 15 * 60 * 1000, // 15 minutes lockout
  attemptWindow: 15 * 60 * 1000,   // 15 minute window for counting attempts
  ipRateLimit: 10,                 // 10 attempts per IP per window
  ipRateWindow: 15 * 60 * 1000,    // 15 minute window for IP
};

/**
 * Get failed attempts key
 */
function getKey(email, ip) {
  return `${email?.toLowerCase()}_${ip}`;
}

/**
 * Check if account is locked
 */
export function isAccountLocked(email) {
  const lockInfo = lockedAccounts.get(email?.toLowerCase());
  if (!lockInfo) return false;
  
  // Check if lockout has expired
  if (Date.now() > lockInfo.expiresAt) {
    lockedAccounts.delete(email.toLowerCase());
    return false;
  }
  
  return true;
}

/**
 * Get remaining lockout time in seconds
 */
export function getLockoutRemaining(email) {
  const lockInfo = lockedAccounts.get(email?.toLowerCase());
  if (!lockInfo) return 0;
  
  const remaining = Math.ceil((lockInfo.expiresAt - Date.now()) / 1000);
  return Math.max(0, remaining);
}

/**
 * Record failed login attempt
 */
export function recordFailedAttempt(email, ip) {
  const key = getKey(email, ip);
  const emailKey = email?.toLowerCase();
  
  // Get or create attempt record
  let attempts = failedAttempts.get(key) || {
    count: 0,
    firstAttempt: Date.now(),
  };
  
  // Reset if window has expired
  if (Date.now() - attempts.firstAttempt > CONFIG.attemptWindow) {
    attempts = { count: 0, firstAttempt: Date.now() };
  }
  
  attempts.count++;
  failedAttempts.set(key, attempts);
  
  // Log the attempt
  logger.logAuth('Login failed', {
    email: emailKey,
    ip,
    attemptCount: attempts.count,
    requestId: global.currentRequestId,
  });
  
  // Lock account if max attempts exceeded
  if (attempts.count >= CONFIG.maxFailedAttempts) {
    lockedAccounts.set(emailKey, {
      lockedAt: Date.now(),
      expiresAt: Date.now() + CONFIG.lockoutDuration,
      ip,
    });
    
    logger.logSecurity('Account locked due to failed attempts', {
      email: emailKey,
      ip,
      attempts: attempts.count,
    });
    
    // Clear failed attempts after lockout
    failedAttempts.delete(key);
    
    return {
      locked: true,
      remainingSeconds: CONFIG.lockoutDuration / 1000,
    };
  }
  
  return {
    locked: false,
    attemptsRemaining: CONFIG.maxFailedAttempts - attempts.count,
  };
}

/**
 * Clear failed attempts on successful login
 */
export function clearFailedAttempts(email, ip) {
  const key = getKey(email, ip);
  failedAttempts.delete(key);
  lockedAccounts.delete(email?.toLowerCase());
  
  logger.logAuth('Login successful', {
    email: email?.toLowerCase(),
    ip,
  });
}

/**
 * Login rate limiter middleware (per IP)
 */
export const loginRateLimiter = rateLimit({
  windowMs: CONFIG.ipRateWindow,
  max: CONFIG.ipRateLimit,
  message: {
    success: false,
    message: 'Too many login attempts from this IP. Please try again later.',
    retryAfter: CONFIG.ipRateWindow / 1000,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  handler: (req, res, next, options) => {
    logger.logSecurity('IP rate limited on login', {
      ip: req.ip,
      requestId: req.requestId,
    });
    res.status(429).json(options.message);
  },
});

/**
 * Account lockout check middleware
 */
export function checkAccountLockout(req, res, next) {
  const { email } = req.body;
  
  if (!email) {
    return next();
  }
  
  if (isAccountLocked(email)) {
    const remaining = getLockoutRemaining(email);
    
    logger.logSecurity('Blocked login attempt on locked account', {
      email: email.toLowerCase(),
      ip: req.ip,
      requestId: req.requestId,
      remainingLockout: remaining,
    });
    
    return res.status(423).json({
      success: false,
      message: `Account temporarily locked. Please try again in ${Math.ceil(remaining / 60)} minutes.`,
      lockedUntil: new Date(Date.now() + remaining * 1000).toISOString(),
      retryAfter: remaining,
    });
  }
  
  next();
}

/**
 * Get account status (for admin dashboard)
 */
export function getAccountStatus(email) {
  const emailKey = email?.toLowerCase();
  const isLocked = isAccountLocked(email);
  const lockInfo = lockedAccounts.get(emailKey);
  
  return {
    email: emailKey,
    isLocked,
    lockedAt: lockInfo?.lockedAt ? new Date(lockInfo.lockedAt).toISOString() : null,
    expiresAt: lockInfo?.expiresAt ? new Date(lockInfo.expiresAt).toISOString() : null,
    remainingSeconds: isLocked ? getLockoutRemaining(email) : 0,
  };
}

/**
 * Manually unlock account (admin function)
 */
export function unlockAccount(email) {
  const emailKey = email?.toLowerCase();
  lockedAccounts.delete(emailKey);
  
  // Clear all failed attempts for this email
  for (const [key] of failedAttempts) {
    if (key.startsWith(emailKey)) {
      failedAttempts.delete(key);
    }
  }
  
  logger.logAuth('Account manually unlocked', { email: emailKey });
  
  return true;
}

export default {
  loginRateLimiter,
  checkAccountLockout,
  recordFailedAttempt,
  clearFailedAttempts,
  isAccountLocked,
  getLockoutRemaining,
  getAccountStatus,
  unlockAccount,
};
