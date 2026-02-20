import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import cors from 'cors';
import xss from 'xss-clean';

/**
 * Security Middleware Configuration
 * 
 * Comprehensive security setup for production
 */

// ==================== HELMET - Security Headers ====================
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // For React
      connectSrc: ["'self'", 'https://api.stripe.com', 'wss:'],
      frameSrc: ["'self'", 'https://www.youtube.com', 'https://player.vimeo.com'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // For external resources
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

// ==================== CORS Configuration ====================
export const corsConfig = cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      process.env.ADMIN_URL || 'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:3000',
    ];

    // Allow requests with no origin (mobile apps, Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400, // 24 hours
});

// ==================== Rate Limiting ====================

// General API rate limiter
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
    });
  },
});

// Strict limiter for authentication
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per 15 minutes
  skipSuccessfulRequests: true, // Don't count successful logins
  message: 'Too many login attempts, please try again later.',
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many login attempts. Please try again in 15 minutes.',
    });
  },
});

// API rate limiter (stricter)
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: 'API rate limit exceeded.',
});

// Upload rate limiter
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: 'Too many uploads, please try again later.',
});

// Search rate limiter
export const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute
  message: 'Too many search requests.',
});

// ==================== MongoDB Sanitization ====================
// Prevents NoSQL injection
export const mongoSanitizeConfig = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`Sanitized key: ${key} in request from ${req.ip}`);
  },
});

// ==================== XSS Protection ====================
// Sanitizes user input to prevent XSS attacks
export const xssProtection = xss();

// ==================== HTTP Parameter Pollution Protection ====================
// Protects against HPP attacks
export const hppProtection = hpp({
  whitelist: [
    'sort',
    'fields',
    'limit',
    'page',
    'category',
    'tag',
    'author',
    'status',
  ],
});

// ==================== CSRF Protection ====================
export const csrfProtection = (req, res, next) => {
  // Skip CSRF for API calls with valid JWT
  if (req.headers.authorization) {
    return next();
  }

  // Check CSRF token for form submissions
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.session?.csrfToken;

  if (!token || token !== sessionToken) {
    return res.status(403).json({
      success: false,
      message: 'Invalid CSRF token',
    });
  }

  next();
};

// ==================== Request Size Limiting ====================
export const requestSizeLimits = {
  json: '10mb', // JSON body limit
  urlencoded: '10mb', // URL-encoded body limit
  text: '10mb', // Text body limit
};

// ==================== Secure Headers ====================
export const secureHeaders = (req, res, next) => {
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');

  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // HSTS (only in production with HTTPS)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  next();
};

// ==================== IP Whitelist/Blacklist ====================
const blacklistedIPs = new Set();
const whitelistedIPs = new Set(['127.0.0.1', '::1']);

export const ipFilter = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;

  // Check if IP is blacklisted
  if (blacklistedIPs.has(clientIP)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied',
    });
  }

  // Admin routes require whitelisted IP (optional)
  if (req.path.startsWith('/admin') && process.env.ENABLE_IP_WHITELIST === 'true') {
    if (!whitelistedIPs.has(clientIP)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied from this IP',
      });
    }
  }

  next();
};

// ==================== Request Logger ====================
export const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date().toISOString(),
    };

    // Log slow requests
    if (duration > 1000) {
      console.warn('SLOW REQUEST:', logData);
    }

    // Log errors
    if (res.statusCode >= 400) {
      console.error('ERROR REQUEST:', logData);
    }
  });

  next();
};

// ==================== Input Validation ====================
export const validateInput = {
  // Validate email
  email: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Validate password strength
  password: (password) => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(password);
  },

  // Validate slug
  slug: (slug) => {
    const slugRegex = /^[a-z0-9-]+$/;
    return slugRegex.test(slug);
  },

  // Sanitize HTML (allow basic formatting only)
  html: (html) => {
    // Remove script tags and dangerous attributes
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '');
  },
};

// ==================== Complete Security Middleware Stack ====================
export const securityMiddleware = [
  requestLogger,
  helmetConfig,
  corsConfig,
  secureHeaders,
  mongoSanitizeConfig,
  xssProtection,
  hppProtection,
  generalLimiter,
  ipFilter,
];

export default securityMiddleware;
