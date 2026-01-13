# 🚀 Performance & Scaling Guide for Bassac Media CMS

This guide covers optimizations for running a news website at scale (1M+ articles).

## Quick Performance Wins Already Implemented

✅ **GZIP Compression** - Reduces response size by 70%+
✅ **Redis Caching** - Sub-millisecond response times
✅ **MongoDB Indexes** - Optimized for 1M+ articles
✅ **Lazy Loading** - Images load on demand
✅ **View Count Buffering** - Reduces DB writes by 99%
✅ **Open Graph Tags** - Perfect social sharing previews
✅ **JSON-LD Structured Data** - Google rich snippets

---

## Database Optimization

### MongoDB Indexes (Already Implemented)

```javascript
// Primary lookup
articleSchema.index({ slug: 1 }, { unique: true });

// Main listing queries
articleSchema.index({ status: 1, publishedAt: -1 });
articleSchema.index({ status: 1, isFeatured: 1, publishedAt: -1 });

// Category pages
articleSchema.index({ category: 1, status: 1, publishedAt: -1 });

// Author's articles
articleSchema.index({ author: 1, status: 1, createdAt: -1 });

// Tag queries
articleSchema.index({ tags: 1, status: 1, publishedAt: -1 });

// Trending/Popular
articleSchema.index({ status: 1, viewCount: -1 });

// Full-text search
articleSchema.index({ title: 'text', excerpt: 'text', tags: 'text' });
```

### MongoDB Best Practices

1. **Use `.lean()` for read-only queries** (20x faster)
2. **Use Replica Set** in production
3. **Set `maxPoolSize: 100`** for high traffic

---

## Caching Strategy

### Redis Setup (Production)

```bash
# .env
REDIS_URL=redis://localhost:6379

# Or use Redis Cloud/Upstash for managed service
REDIS_URL=redis://default:password@host:port
```

### Cache TTL Settings

| Data Type | TTL | Reason |
|-----------|-----|--------|
| Article by slug | 10 min | Content rarely changes |
| Article lists | 3 min | New content frequently |
| Featured articles | 5 min | Editor curated |
| Categories | 30 min | Rarely changes |
| Site settings | 10 min | Admin changes |

### View Count Buffering

Instead of updating MongoDB on every view (expensive), we:
1. Increment view in Redis: `INCR views:articleId`
2. Flush to MongoDB every 5 minutes
3. Result: 99% fewer database writes

---

## SEO & Social Sharing

### Open Graph Tags (Facebook, LinkedIn)

When someone shares your article:
- Shows thumbnail image (1200x630 recommended)
- Shows title
- Shows description
- Shows site name

```html
<meta property="og:type" content="article" />
<meta property="og:title" content="Article Title" />
<meta property="og:description" content="Article excerpt..." />
<meta property="og:image" content="https://yoursite.com/image.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
```

### Twitter Cards

```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Article Title" />
<meta name="twitter:image" content="https://yoursite.com/image.jpg" />
```

### Test Your SEO

- Facebook: https://developers.facebook.com/tools/debug/
- Twitter: https://cards-dev.twitter.com/validator
- Google: https://search.google.com/test/rich-results

---

## Recommended Production Stack

```
Frontend:
  - Vercel or Netlify (auto-CDN, SSL)
  - Cloudflare for additional caching

Backend:
  - Railway, Render, or AWS EC2
  - PM2 for process management

Database:
  - MongoDB Atlas (managed, auto-scaling)
  - Redis Cloud or Upstash (managed Redis)

Images:
  - Cloudinary (auto-optimization, CDN)
```

---

## Environment Variables for Production

```bash
# Required
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/bassac
REDIS_URL=redis://default:pass@host:6379
SITE_URL=https://yourdomain.com
SITE_NAME=Your Site Name

# Recommended
STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx
```

---

## Performance Checklist

- [ ] Enable Redis caching (`REDIS_URL` set)
- [ ] Use MongoDB Atlas with indexes
- [ ] Configure CDN (Cloudflare)
- [ ] Use Cloudinary for images
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS
- [ ] Test Open Graph tags work
- [ ] Lighthouse score > 90

---

## Scaling for 1M+ Articles

1. **MongoDB**: Use Atlas M30+ cluster
2. **Redis**: Use Redis Cluster mode
3. **Backend**: 3+ replicas behind load balancer
4. **CDN**: Cache API responses at edge
5. **Search**: Consider Elasticsearch for heavy search

---

## Monitoring

Recommended tools:
- **Uptime**: UptimeRobot (free)
- **Errors**: Sentry
- **APM**: New Relic or Datadog
- **Logs**: Logtail or Papertrail
