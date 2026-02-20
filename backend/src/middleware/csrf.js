/**
 * CSRF Protection Middleware
 * Protects against Cross-Site Request Forgery attacks
 * 
 * Implementation uses Double Submit Cookie pattern:
 * 1. Server generates a CSRF token and sends it in a cookie
 * 2. Client must include the token in request header (X-CSRF-Token)
 * 3. Server verifies the header matches the cookie
 * 
 * This approach works well with SPAs and doesn't require server-side session storage
 */

import crypto from 'crypto';
import logger from '../services/loggerService.js';

const normalizeSameSite = (value) => {
  const raw = (value || '').toLowerCase();
  if (raw === 'none' || raw === 'lax' || raw === 'strict') return raw;
  return process.env.NODE_ENV === 'production' ? 'lax' : 'strict';
};

const csrfSameSite = normalizeSameSite(process.env.CSRF_COOKIE_SAMESITE);
const csrfSecure =
  process.env.CSRF_COOKIE_SECURE === 'true' ||
  (process.env.CSRF_COOKIE_SECURE !== 'false' &&
    (process.env.NODE_ENV === 'production' || csrfSameSite === 'none'));

// Configuration
const CONFIG = {
  tokenLength: 32,
  cookieName: 'csrf-token',
  headerName: 'x-csrf-token',
  cookieOptions: {
    httpOnly: false,  // Must be false so JS can read it
    secure: csrfSecure,
    sameSite: csrfSameSite,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
  // Methods that require CSRF protection
  protectedMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  // Paths that don't require CSRF protection (without /api prefix as it's stripped)
  excludePaths: [
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verify-email',
    '/contact',
    '/newsletter/subscribe',
    '/newsletter/unsubscribe',
    '/health',
  ],
};

/**
 * Generate CSRF token
 */
function generateToken() {
  return crypto.randomBytes(CONFIG.tokenLength).toString('hex');
}

/**
 * Verify CSRF token
 */
function verifyToken(cookieToken, headerToken) {
  if (!cookieToken || !headerToken) return false;
  
  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(cookieToken),
      Buffer.from(headerToken)
    );
  } catch {
    return false;
  }
}

/**
 * Check if path is excluded from CSRF protection
 */
function isExcludedPath(path, method) {
  // GET requests are generally safe (should be idempotent)
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return true;
  }
  
  // Check excluded paths
  return CONFIG.excludePaths.some(excludePath => {
    if (excludePath.endsWith('*')) {
      return path.startsWith(excludePath.slice(0, -1));
    }
    return path === excludePath || path.startsWith(excludePath + '/');
  });
}

function hasBearerAuth(req) {
  const authHeader = req.get('authorization') || '';
  return authHeader.startsWith('Bearer ');
}

/**
 * CSRF Token Generator Middleware
 * Generates and sets CSRF token cookie
 */
export function csrfTokenGenerator(req, res, next) {
  // Check if token already exists in cookie
  let token = req.cookies?.[CONFIG.cookieName];
  
  // Generate new token if none exists
  if (!token) {
    token = generateToken();
    res.cookie(CONFIG.cookieName, token, CONFIG.cookieOptions);
  }
  
  // Add token to response locals for access in views
  res.locals.csrfToken = token;
  
  // Add method to get token (useful for APIs)
  req.csrfToken = () => token;
  
  next();
}

/**
 * CSRF Protection Middleware
 * Validates CSRF token on protected routes
 */
export function csrfProtection(req, res, next) {
  // Skip if method doesn't require protection
  if (!CONFIG.protectedMethods.includes(req.method)) {
    return next();
  }

  // JWT-authenticated API requests are not vulnerable to browser CSRF
  // because attacker sites cannot read/send victim Bearer tokens.
  if (hasBearerAuth(req)) {
    return next();
  }
  
  // Skip excluded paths
  if (isExcludedPath(req.path, req.method)) {
    return next();
  }
  
  // Get tokens
  const cookieToken = req.cookies?.[CONFIG.cookieName];
  const headerToken = req.get(CONFIG.headerName);
  
  // Verify token
  if (!verifyToken(cookieToken, headerToken)) {
    logger.logSecurity('CSRF token validation failed', {
      requestId: req.requestId,
      ip: req.ip,
      path: req.path,
      method: req.method,
      hasCookie: !!cookieToken,
      hasHeader: !!headerToken,
    });
    
    return res.status(403).json({
      success: false,
      message: 'Invalid or missing CSRF token',
      code: 'CSRF_INVALID',
    });
  }
  
  next();
}

/**
 * Get CSRF Token endpoint
 * GET /api/auth/csrf-token
 */
export function getCsrfToken(req, res) {
  let token = req.cookies?.[CONFIG.cookieName];
  
  if (!token) {
    token = generateToken();
    res.cookie(CONFIG.cookieName, token, CONFIG.cookieOptions);
  }
  
  res.json({
    success: true,
    data: { csrfToken: token },
  });
}

/**
 * CSRF middleware for SPA
 * Combined middleware that handles both generation and protection
 */
export function csrfMiddleware(req, res, next) {
  // Generate token first
  csrfTokenGenerator(req, res, (err) => {
    if (err) return next(err);
    
    // Then protect
    csrfProtection(req, res, next);
  });
}

export default {
  csrfTokenGenerator,
  csrfProtection,
  csrfMiddleware,
  getCsrfToken,
};
