import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

import config from './config/index.js';
import connectDB from './config/database.js';
import routes from './routes/index.js';
import shareRoutes from './routes/shareRoutes.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { sanitizeQuery } from './middleware/validation.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { csrfTokenGenerator, csrfProtection } from './middleware/csrf.js';
import setupSocketIO from './config/socket.js';
import cacheService from './services/cacheService.js';
import logger from './services/loggerService.js';
import backfillUserProfileFields from './utils/backfillUserProfileFields.js';

// ES Module dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();

// Create HTTP server for Socket.io
const server = http.createServer(app);

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// ==================== SECURITY MIDDLEWARE ====================

// Request ID for tracing (must be first)
app.use(requestIdMiddleware);

// Request logging
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.logRequest(req, res, duration);
  });
  
  next();
});

// Silence automatic browser favicon probes on API origin
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Helmet security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", config.frontendUrl, config.apiBaseUrl],
      mediaSrc: ["'self'", 'https:'],
      frameSrc: ["'self'", 'https:', 'data:'],
    },
  },
}));

// GZIP Compression - CRITICAL for performance
app.use(compression({
  level: 6, // Balance between speed and compression
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
}));

// CORS configuration
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID'],
}));

// Cookie parser (required for CSRF)
app.use(cookieParser());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sanitize query params
app.use(sanitizeQuery);

// CSRF protection (generate token on all requests, validate on mutations)
app.use(csrfTokenGenerator);
app.use('/api', csrfProtection);

// Rate limiting
app.use('/api', apiLimiter);

// Static files (uploads) with caching headers
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '7d', // Cache static files for 7 days
  etag: true,
  lastModified: true,
}));

// Share pages (server-rendered Open Graph for social previews)
app.use('/share', shareRoutes);
// Backward-compatible share landing (supports legacy /article/:slug links on API origin)
app.use('/article', shareRoutes);

// API Routes
app.use('/api', routes);

// Health check endpoint (for load balancers)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    requestId: req.requestId,
  });
});

// Root endpoint (platform probes and manual browser checks)
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Bassac Post API is running',
    health: '/health',
    apiHealth: '/api/health',
  });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

// Flush view counts to database periodically
const flushViewCounts = async () => {
  try {
    const { Article } = await import('./models/index.js');
    const keys = await cacheService.getAllBufferedViewKeys();
    
    for (const key of keys) {
      const articleId = key.split(':').pop();
      const count = await cacheService.getBufferedViews(articleId);
      
      if (count > 0) {
        await Article.findByIdAndUpdate(articleId, { 
          $inc: { viewCount: count } 
        });
      }
    }
    logger.debug(`Flushed view counts for ${keys.length} articles`);
  } catch (error) {
    logger.error('Error flushing view counts', { error });
  }
};

// Aggregate ad stats daily
const aggregateAdStatsJob = async () => {
  try {
    const { aggregateAdStats } = await import('./jobs/aggregateAdStats.js');
    const result = await aggregateAdStats();
    logger.info(`Ad stats aggregation complete`, { adsProcessed: result.adsProcessed });
  } catch (error) {
    logger.error('Error aggregating ad stats', { error });
  }
};

// Schedule ad stats aggregation at 1 AM daily
const scheduleAdStatsAggregation = () => {
  const now = new Date();
  const target = new Date(now);
  target.setDate(target.getDate() + 1);
  target.setHours(1, 0, 0, 0); // 1 AM tomorrow
  
  const delay = target.getTime() - now.getTime();
  
  setTimeout(() => {
    aggregateAdStatsJob();
    // Then repeat every 24 hours
    setInterval(aggregateAdStatsJob, 24 * 60 * 60 * 1000);
  }, delay);
  
  logger.info(`Ad stats aggregation scheduled for ${target.toISOString()}`);
};

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    logger.info('Database connected');

    // Backfill legacy user profile columns/default avatars
    await backfillUserProfileFields();
    
    // Connect to cache (Redis or memory)
    await cacheService.connect();
    logger.info(`Cache connected (${config.redisUrl ? 'Redis' : 'In-Memory'})`);

    // Setup Socket.io for real-time notifications
    const io = setupSocketIO(server);
    logger.info('Socket.io initialized');
    
    // Make io and cache available to the app
    app.set('io', io);
    app.set('cache', cacheService);

    // Flush view counts every 5 minutes
    setInterval(flushViewCounts, 5 * 60 * 1000);

    // Schedule daily ad stats aggregation (1 AM)
    if (config.env === 'production') {
      scheduleAdStatsAggregation();
    }

    // Start listening
    server.listen(config.port, () => {
      logger.info(`Server started on port ${config.port}`);
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 Bassac Post API Server                       ║
║                                                           ║
║   Environment: ${config.env.padEnd(40)}║
║   Port: ${String(config.port).padEnd(47)}║
║   URL: ${`http://localhost:${config.port}`.padEnd(47)}║
║   Socket.io: Enabled                                      ║
║   Compression: Enabled                                    ║
║   CSRF Protection: Enabled                                ║
║   Request Tracing: Enabled                                ║
║   Cache: ${(config.redisUrl ? 'Redis' : 'In-Memory').padEnd(45)}║
║   Ad Stats Job: ${(config.env === 'production' ? 'Scheduled (1 AM)' : 'Disabled (dev)').padEnd(38)}║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down gracefully...');
  
  // Flush remaining view counts
  await flushViewCounts();
  
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection', { error: err });
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err });
  process.exit(1);
});

startServer().then();
