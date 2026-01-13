# Bassac Media CMS - Architecture & Production Guide

## Overview

This document describes the architecture improvements made based on a senior engineer audit. The changes address critical security, scalability, and data integrity issues.

---

## Critical Fixes Implemented

### 1. XSS Prevention (Security)

**Problem**: Arbitrary HTML was accepted without sanitization in custom blocks, ads, and widgets.

**Solution**: Created `sanitizationService.js` with:
- Strict HTML allowlist (safe tags only)
- Event handler removal (`onclick`, `onerror`, etc.)
- JavaScript URL blocking
- CSS expression filtering
- Trusted iframe source validation

**Usage**:
```javascript
import sanitizationService from '../services/sanitizationService.js';

// Sanitize ad HTML
const safeHtml = sanitizationService.adHtml(userProvidedHtml);

// Sanitize article content
const safeContent = sanitizationService.articleContent(content);

// Plain text (removes all HTML)
const plainText = sanitizationService.plainText(input);

// URL validation
const safeUrl = sanitizationService.url(url, 'link'); // or 'image', 'iframe'
```

---

### 2. Ads System Refactored (Scalability)

**Problem**: Ads stored in `SiteSettings` caused:
- Heavy writes on every update
- Poor indexing for targeting queries
- Concurrency issues between admins
- Inefficient analytics

**Solution**: Separate collections:

#### Ad Model (`models/Ad.js`)
```javascript
// Each ad is its own document
{
  name: "Summer Sale Banner",
  status: "active", // draft, active, paused, archived
  type: "image",
  placement: "between_sections",
  targeting: {
    pages: "homepage",
    devices: { desktop: true, mobile: true },
    userStatus: { loggedIn: true, guest: true }
  },
  schedule: {
    startDate: Date,
    endDate: Date
  },
  priority: 10,
  weight: 100
}
```

#### AdEvent Model (`models/AdEvent.js`)
```javascript
// Tracks impressions and clicks
{
  adId: ObjectId,
  type: "impression", // or "click"
  sessionId: "...",
  device: "mobile",
  pageType: "article"
}
// TTL index auto-deletes after 90 days
```

#### AdStatsDaily Model (`models/AdStatsDaily.js`)
```javascript
// Daily aggregated stats for dashboards
{
  adId: ObjectId,
  date: Date,
  impressions: 1500,
  clicks: 45,
  ctr: 3.0,
  byDevice: { desktop: {...}, mobile: {...} }
}
```

---

### 3. Server-Side Ad Selection

**Problem**: Frontend-driven ad selection allows manipulation.

**Solution**: `adSelectionService.js` handles:
- Targeting evaluation (page, device, user status)
- Schedule filtering
- Frequency control (per session/day)
- Weighted rotation
- Priority sorting

**API Endpoints**:
```
GET  /api/ads/select?placement=between_sections&pageType=homepage&device=mobile
GET  /api/ads/homepage
GET  /api/ads/article/:articleId
POST /api/ads/event  { adId, type: "impression" | "click" }
```

---

### 4. Homepage Section Validation

**Problem**: Sections saved without validation; `categorySlug` vs `categoryId` mismatches.

**Solution**: `validators/homepageValidator.js`:
- Zod schema per section type
- Server-generated stable IDs
- Category slug → ID resolution
- HTML sanitization for custom blocks

**Flow**:
```
Client sends sections
    ↓
Server normalizes (resolves slugs, generates IDs)
    ↓
Server validates (Zod schemas)
    ↓
Server sanitizes HTML
    ↓
Save to database
```

---

## New API Routes

### Ads API (`/api/ads`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/select` | Public | Select ads for display |
| GET | `/homepage` | Public | Get homepage ads |
| GET | `/article/:id` | Public | Get article page ads |
| POST | `/event` | Public | Track impression/click |
| GET | `/` | Admin | List all ads |
| POST | `/` | Admin | Create ad |
| GET | `/:id` | Admin | Get ad details |
| PUT | `/:id` | Admin | Update ad |
| DELETE | `/:id` | Admin | Archive ad |
| POST | `/:id/duplicate` | Admin | Duplicate ad |
| GET | `/:id/stats` | Admin | Get ad statistics |
| GET | `/stats/summary` | Admin | All ads summary |
| PATCH | `/bulk/status` | Admin | Bulk status update |

---

## Database Collections

### New Collections

| Collection | Purpose | Indexes |
|------------|---------|---------|
| `ads` | Ad inventory | `status`, `placement`, `priority`, `schedule` |
| `adevents` | Event tracking | `adId`, `type`, `sessionId`, `createdAt` (TTL) |
| `adstatsdailies` | Aggregated stats | `adId + date` (unique) |

### Migration from SiteSettings

The legacy `bodyAds` array in `SiteSettings` is kept for backward compatibility but should be migrated to the `ads` collection:

```javascript
// Migration script (run once)
const settings = await SiteSettings.getSettings();
const legacyAds = settings.bodyAds?.ads || [];

for (const ad of legacyAds) {
  await Ad.create({
    name: ad.name,
    status: ad.isActive ? 'active' : 'draft',
    type: ad.type,
    imageUrl: ad.imageUrl,
    // ... map other fields
  });
}
```

---

## Security Checklist

### Implemented ✅
- [x] HTML sanitization service
- [x] XSS prevention in ads, sections, widgets
- [x] URL validation
- [x] Event handler stripping
- [x] Trusted iframe sources only

### Recommended (Not Yet Implemented)
- [ ] Content Security Policy (CSP) headers
- [ ] Nonce-based inline scripts
- [ ] CSRF cookie fix for cross-subdomain
- [ ] Rate limiting on ad event endpoint
- [ ] Admin audit logging

---

## Performance Recommendations

### Implemented
1. **Separate ad collection** - No more hot writes to SiteSettings
2. **TTL on events** - Auto-cleanup after 90 days
3. **Compound indexes** - Efficient ad selection queries

### Recommended
1. **Redis caching** - Cache ad selections per page/device
2. **Bulk event processing** - Queue impressions, write in batches
3. **CDN for ad images** - Serve from edge
4. **Daily aggregation job** - Cron to populate AdStatsDaily

---

## Frontend Integration

### Using the New Ads API

```javascript
// In HomePage or ArticlePage component
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

function HomePage() {
  // Fetch ads from new API
  const { data: adsData } = useQuery({
    queryKey: ['homepage-ads'],
    queryFn: () => api.get('/ads/homepage', {
      params: { device: isMobile ? 'mobile' : 'desktop' }
    })
  });

  const ads = adsData?.ads || {};

  return (
    <>
      <HeroSection />
      
      {/* Insert ad after hero */}
      {ads.after_hero?.map(ad => (
        <BodyAd key={ad._id} ad={ad} onImpression={trackImpression} />
      ))}
      
      {sections.map((section, index) => (
        <Fragment key={section.id}>
          <Section {...section} />
          
          {/* Insert ad between sections */}
          {ads.between_sections?.[index]?.map(ad => (
            <BodyAd key={ad._id} ad={ad} onImpression={trackImpression} />
          ))}
        </Fragment>
      ))}
    </>
  );
}

// Track impression
async function trackImpression(adId) {
  await api.post('/ads/event', {
    adId,
    type: 'impression',
    pageType: 'homepage',
    device: isMobile ? 'mobile' : 'desktop'
  });
}
```

---

## File Structure (New Files)

```
backend/src/
├── models/
│   ├── Ad.js              # Ad collection model
│   ├── AdEvent.js         # Event tracking model
│   └── AdStatsDaily.js    # Aggregated stats model
├── controllers/
│   └── adsController.js   # Ad API handlers
├── routes/
│   └── adsRoutes.js       # Ad API routes
├── services/
│   ├── adSelectionService.js    # Server-side ad selection
│   └── sanitizationService.js   # XSS prevention
└── validators/
    └── homepageValidator.js     # Section validation

frontend/src/
└── components/
    └── ads/
        ├── BodyAd.jsx     # Ad display component
        └── index.js       # Exports
```

---

## Deployment Notes

### Environment Variables (New)

```env
# Optional: Ad event tracking
AD_EVENT_TTL_DAYS=90
AD_STATS_AGGREGATION_CRON="0 1 * * *"  # 1 AM daily
```

### Database Indexes (Create Manually or via Migration)

```javascript
// Run in MongoDB shell or migration script
db.ads.createIndex({ status: 1, placement: 1, priority: -1 });
db.ads.createIndex({ "schedule.startDate": 1, "schedule.endDate": 1 });
db.adevents.createIndex({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days
db.adstatsdailies.createIndex({ adId: 1, date: 1 }, { unique: true });
```

---

## Next Steps (Roadmap)

### Phase 1: Stability (Current)
- ✅ Sanitization service
- ✅ Separate ads collection
- ✅ Server-side ad selection
- ✅ Homepage validation

### Phase 2: Security Hardening
- [ ] Add CSP headers
- [ ] Fix CSRF for production topology
- [ ] Admin audit logging
- [ ] Rate limiting on public endpoints

### Phase 3: Feature Completion
- [ ] Frontend integration with new ads API
- [ ] Ad preview in admin
- [ ] Draft/publish workflow for homepage
- [ ] Daily stats aggregation cron job

### Phase 4: Scale
- [ ] Redis caching for ad selections
- [ ] Bulk event processing
- [ ] CDN integration
- [ ] A/B testing for ads

---

## Questions?

This architecture is designed to scale while maintaining security. For questions about implementation details, refer to the individual service files or the API documentation.
