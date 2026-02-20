/**
 * Request ID Middleware
 * Adds unique request ID to each request for tracing across logs
 */

import crypto from 'crypto';

/**
 * Generate unique request ID
 * Format: req_<timestamp>_<random>
 */
function generateRequestId() {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString('hex');
  return `req_${timestamp}_${random}`;
}

/**
 * Request ID middleware
 * - Generates unique ID for each request
 * - Adds it to req.requestId
 * - Adds it to response headers (X-Request-ID)
 */
export function requestIdMiddleware(req, res, next) {
  // Use existing request ID from header (for distributed tracing) or generate new one
  const requestId = req.get('X-Request-ID') || generateRequestId();
  
  // Attach to request object
  req.requestId = requestId;
  
  // Add to response headers
  res.setHeader('X-Request-ID', requestId);
  
  next();
}

/**
 * Request logging middleware
 * Logs request start and completion with timing
 */
export function requestLoggingMiddleware(req, res, next) {
  const startTime = Date.now();
  
  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { default: logger } = require('./services/loggerService.js');
    logger.logRequest(req, res, duration);
  });
  
  next();
}

export default requestIdMiddleware;
