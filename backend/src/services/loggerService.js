/**
 * Logger Service
 * Centralized logging with levels, timestamps, and request tracking
 * 
 * In production, this can be extended to send logs to:
 * - File (rotating logs)
 * - ELK Stack (Elasticsearch, Logstash, Kibana)
 * - Cloud services (Datadog, CloudWatch, etc.)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  HTTP: 3,
  DEBUG: 4,
};

// Colors for console output
const COLORS = {
  ERROR: '\x1b[31m', // Red
  WARN: '\x1b[33m',  // Yellow
  INFO: '\x1b[36m',  // Cyan
  HTTP: '\x1b[35m',  // Magenta
  DEBUG: '\x1b[37m', // White
  RESET: '\x1b[0m',
};

class LoggerService {
  constructor() {
    this.level = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;
    this.logToFile = process.env.LOG_TO_FILE === 'true';
    this.logDir = path.join(__dirname, '../../logs');
    
    // Create logs directory if logging to file
    if (this.logToFile && !fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Format log message
   */
  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const requestId = meta.requestId || '-';
    const userId = meta.userId || '-';
    
    // Remove meta fields that are already in the format
    const { requestId: _, userId: __, ...extraMeta } = meta;
    const extraInfo = Object.keys(extraMeta).length > 0 
      ? ` | ${JSON.stringify(extraMeta)}` 
      : '';

    return {
      formatted: `[${timestamp}] [${level}] [${requestId}] [User:${userId}] ${message}${extraInfo}`,
      json: {
        timestamp,
        level,
        requestId,
        userId,
        message,
        ...extraMeta,
      },
    };
  }

  /**
   * Write log to console and optionally to file
   */
  write(level, message, meta = {}) {
    if (LOG_LEVELS[level] > this.level) return;

    const { formatted, json } = this.formatMessage(level, message, meta);
    
    // Console output with colors
    const color = COLORS[level] || COLORS.RESET;
    console.log(`${color}${formatted}${COLORS.RESET}`);

    // File output (JSON format for parsing)
    if (this.logToFile) {
      const logFile = path.join(this.logDir, `${new Date().toISOString().split('T')[0]}.log`);
      fs.appendFileSync(logFile, JSON.stringify(json) + '\n');
    }

    // For errors, also log stack trace
    if (level === 'ERROR' && meta.error instanceof Error) {
      console.error(meta.error.stack);
      if (this.logToFile) {
        const errorFile = path.join(this.logDir, `errors-${new Date().toISOString().split('T')[0]}.log`);
        fs.appendFileSync(errorFile, JSON.stringify({
          ...json,
          stack: meta.error.stack,
        }) + '\n');
      }
    }
  }

  // Log level methods
  error(message, meta = {}) {
    this.write('ERROR', message, meta);
  }

  warn(message, meta = {}) {
    this.write('WARN', message, meta);
  }

  info(message, meta = {}) {
    this.write('INFO', message, meta);
  }

  http(message, meta = {}) {
    this.write('HTTP', message, meta);
  }

  debug(message, meta = {}) {
    this.write('DEBUG', message, meta);
  }

  /**
   * Log API request
   */
  logRequest(req, res, duration) {
    const meta = {
      requestId: req.requestId,
      userId: req.user?._id?.toString(),
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };

    const level = res.statusCode >= 500 ? 'ERROR' 
      : res.statusCode >= 400 ? 'WARN' 
      : 'HTTP';

    this.write(level, `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`, meta);
  }

  /**
   * Log database operation
   */
  logDB(operation, collection, duration, meta = {}) {
    this.debug(`DB ${operation} on ${collection} (${duration}ms)`, meta);
  }

  /**
   * Log authentication event
   */
  logAuth(event, meta = {}) {
    const level = event.includes('failed') || event.includes('locked') ? 'WARN' : 'INFO';
    this.write(level, `Auth: ${event}`, meta);
  }

  /**
   * Log security event
   */
  logSecurity(event, meta = {}) {
    this.warn(`Security: ${event}`, meta);
  }
}

// Export singleton
const logger = new LoggerService();
export default logger;
