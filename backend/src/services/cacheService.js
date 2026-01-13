/**
 * Cache Service for Production News Website
 * Supports Redis (production) or In-Memory (development)
 * 
 * For 1M+ articles, caching is CRITICAL for performance
 */

import Redis from 'ioredis';
import config from '../config/index.js';

class CacheService {
  constructor() {
    this.client = null;
    this.memoryCache = new Map();
    this.isRedis = false;
    this.defaultTTL = 300; // 5 minutes default
  }

  async connect() {
    if (config.redisUrl) {
      try {
        this.client = new Redis(config.redisUrl, {
          maxRetriesPerRequest: 3,
          retryDelayOnFailover: 100,
          enableReadyCheck: true,
          reconnectOnError: (err) => {
            console.warn('Redis reconnecting due to:', err.message);
            return true;
          },
        });
        
        // Wait for ready event
        await new Promise((resolve, reject) => {
          this.client.on('ready', () => {
            this.isRedis = true;
            console.log('✅ Redis cache connected');
            resolve();
          });
          this.client.on('error', (err) => {
            console.warn('⚠️ Redis error:', err.message);
            reject(err);
          });
          // Timeout after 5 seconds
          setTimeout(() => reject(new Error('Redis connection timeout')), 5000);
        });
      } catch (error) {
        console.warn('⚠️ Redis unavailable, using in-memory cache:', error.message);
        this.isRedis = false;
        this.client = null;
      }
    } else {
      console.log('📦 Using in-memory cache (set REDIS_URL for production)');
    }
  }

  // Generate cache key
  key(prefix, ...parts) {
    return `bassac:${prefix}:${parts.join(':')}`;
  }

  // Get cached value
  async get(key) {
    try {
      if (this.isRedis && this.client) {
        const data = await this.client.get(key);
        return data ? JSON.parse(data) : null;
      }
      
      const cached = this.memoryCache.get(key);
      if (cached && cached.expires > Date.now()) {
        return cached.data;
      }
      this.memoryCache.delete(key);
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  // Set cached value
  async set(key, value, ttl = this.defaultTTL) {
    try {
      if (this.isRedis && this.client) {
        await this.client.setex(key, ttl, JSON.stringify(value));
      } else {
        this.memoryCache.set(key, {
          data: value,
          expires: Date.now() + (ttl * 1000),
        });
        
        // Limit memory cache size
        if (this.memoryCache.size > 10000) {
          const firstKey = this.memoryCache.keys().next().value;
          this.memoryCache.delete(firstKey);
        }
      }
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  // Delete cached value
  async del(key) {
    try {
      if (this.isRedis && this.client) {
        await this.client.del(key);
      } else {
        this.memoryCache.delete(key);
      }
      return true;
    } catch (error) {
      console.error('Cache del error:', error);
      return false;
    }
  }

  // Delete by pattern (Redis only)
  async delPattern(pattern) {
    try {
      if (this.isRedis && this.client) {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } else {
        // Memory cache pattern delete
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        for (const key of this.memoryCache.keys()) {
          if (regex.test(key)) {
            this.memoryCache.delete(key);
          }
        }
      }
      return true;
    } catch (error) {
      console.error('Cache delPattern error:', error);
      return false;
    }
  }

  // Cache wrapper - get or set
  async getOrSet(key, fetchFn, ttl = this.defaultTTL) {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetchFn();
    await this.set(key, data, ttl);
    return data;
  }

  // ==================== ARTICLE CACHE METHODS ====================

  // Cache article by slug (most accessed)
  async getArticle(slug) {
    return this.get(this.key('article', slug));
  }

  async setArticle(slug, article, ttl = 600) { // 10 min
    return this.set(this.key('article', slug), article, ttl);
  }

  async invalidateArticle(slug) {
    return this.del(this.key('article', slug));
  }

  // Cache article list (homepage, category pages)
  async getArticleList(listKey) {
    return this.get(this.key('articles', listKey));
  }

  async setArticleList(listKey, articles, ttl = 180) { // 3 min
    return this.set(this.key('articles', listKey), articles, ttl);
  }

  async invalidateArticleLists() {
    return this.delPattern('bassac:articles:*');
  }

  // Cache featured articles (changes rarely)
  async getFeatured() {
    return this.get(this.key('featured'));
  }

  async setFeatured(articles, ttl = 300) { // 5 min
    return this.set(this.key('featured'), articles, ttl);
  }

  // Cache categories (changes very rarely)
  async getCategories() {
    return this.get(this.key('categories'));
  }

  async setCategories(categories, ttl = 1800) { // 30 min
    return this.set(this.key('categories'), categories, ttl);
  }

  async invalidateCategories() {
    return this.del(this.key('categories'));
  }

  // Cache site settings (changes rarely)
  async getSiteSettings() {
    return this.get(this.key('settings'));
  }

  async setSiteSettings(settings, ttl = 600) { // 10 min
    return this.set(this.key('settings'), settings, ttl);
  }

  async invalidateSiteSettings() {
    return this.del(this.key('settings'));
  }

  // ==================== VIEW COUNT BUFFER ====================
  // Buffer view counts to reduce DB writes (write every 5 min)
  
  async bufferViewCount(articleId) {
    const key = this.key('views', articleId);
    if (this.isRedis && this.client) {
      return this.client.incr(key);
    }
    const current = this.memoryCache.get(key)?.data || 0;
    this.memoryCache.set(key, { data: current + 1, expires: Date.now() + 600000 });
    return current + 1;
  }

  async getBufferedViews(articleId) {
    const key = this.key('views', articleId);
    if (this.isRedis && this.client) {
      const count = await this.client.get(key);
      await this.client.del(key);
      return parseInt(count) || 0;
    }
    const cached = this.memoryCache.get(key);
    this.memoryCache.delete(key);
    return cached?.data || 0;
  }

  async getAllBufferedViewKeys() {
    if (this.isRedis && this.client) {
      return this.client.keys('bassac:views:*');
    }
    return Array.from(this.memoryCache.keys()).filter(k => k.startsWith('bassac:views:'));
  }
}

// Singleton instance
const cacheService = new CacheService();

export default cacheService;
