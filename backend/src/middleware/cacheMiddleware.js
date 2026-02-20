/**
 * Response Caching Middleware
 * 
 * Automatically caches GET responses to reduce database load
 * Perfect for public endpoints with high traffic
 * 
 * Usage:
 *   router.get('/articles', cacheMiddleware(180), getArticles)
 *   router.get('/articles/featured', cacheMiddleware(300), getFeaturedArticles)
 */

import cacheService from '../services/cacheService.js';

/**
 * Cache middleware for GET responses
 * @param {number} ttl - Time to live in seconds (default: 300 = 5 minutes)
 * @param {object} options - Additional options
 * @returns {Function} Express middleware
 */
export const cacheMiddleware = (ttl = 300, options = {}) => {
  const {
    // Skip cache if user is authenticated
    skipAuth = true,
    // Custom key generator function
    keyGenerator = null,
    // Skip cache for certain query params
    skipParams = [],
    // Include specific headers in cache key
    varyHeaders = [],
  } = options;

  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip if user is authenticated and skipAuth is true
    if (skipAuth && req.user) {
      return next();
    }

    // Skip if any skipParams are present
    if (skipParams.length > 0 && skipParams.some(param => req.query[param])) {
      return next();
    }

    // Generate cache key
    let cacheKey;
    if (keyGenerator) {
      cacheKey = keyGenerator(req);
    } else {
      // Default key: URL + query params + varied headers
      const queryString = JSON.stringify(req.query);
      const headers = varyHeaders.map(h => req.get(h) || '').join(':');
      cacheKey = `response:${req.originalUrl}:${queryString}:${headers}`;
    }

    try {
      // Try to get from cache
      const cached = await cacheService.get(cacheKey);
      
      if (cached) {
        // Add cache hit header
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', cacheKey.substring(0, 50));
        return res.json(cached);
      }

      // Cache miss - intercept response
      res.setHeader('X-Cache', 'MISS');
      
      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache response
      res.json = (data) => {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Set cache in background (don't await)
          cacheService.set(cacheKey, data, ttl).catch(err => {
            console.error('Cache set error:', err.message);
          });
        }
        
        return originalJson(data);
      };

      next();
    } catch (error) {
      // On error, just pass through without caching
      console.error('Cache middleware error:', error.message);
      next();
    }
  };
};

/**
 * Cache invalidation middleware
 * Automatically invalidates cache on mutations
 * 
 * Usage:
 *   router.post('/articles', invalidateCacheMiddleware('articles:*'), createArticle)
 */
export const invalidateCacheMiddleware = (...patterns) => {
  return async (req, res, next) => {
    // Store original json/send methods
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    // Create wrapper to invalidate after successful response
    const invalidateAndRespond = (method) => {
      return (data) => {
        // Only invalidate on successful mutations
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Invalidate patterns in background
          patterns.forEach(pattern => {
            cacheService.delPattern(pattern).catch(err => {
              console.error('Cache invalidation error:', err.message);
            });
          });
        }
        
        return method(data);
      };
    };

    // Override response methods
    res.json = invalidateAndRespond(originalJson);
    res.send = invalidateAndRespond(originalSend);

    next();
  };
};

/**
 * Conditional caching based on custom logic
 * 
 * Usage:
 *   router.get('/articles', conditionalCache({
 *     condition: (req) => !req.query.realtime,
 *     ttl: 300
 *   }), getArticles)
 */
export const conditionalCache = (options = {}) => {
  const {
    condition = () => true,
    ttl = 300,
    ...rest
  } = options;

  return (req, res, next) => {
    if (condition(req)) {
      return cacheMiddleware(ttl, rest)(req, res, next);
    }
    next();
  };
};

/**
 * Vary cache by specific request properties
 * Useful for personalized but cacheable content
 * 
 * Usage:
 *   router.get('/feed', varyCache(['accept-language']), getFeed)
 */
export const varyCache = (headers = []) => {
  return cacheMiddleware(300, { varyHeaders: headers });
};

export default cacheMiddleware;
