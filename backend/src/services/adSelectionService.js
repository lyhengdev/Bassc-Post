import mongoose from 'mongoose';
import Ad from '../models/Ad.js';
import AdEvent from '../models/AdEvent.js';
import cacheService from './cacheService.js';
import {
  buildDedupeKey,
  buildIdentityKey,
  buildPageKey,
  normalizePagePath,
  normalizePageType
} from '../utils/adTracking.js';

/**
 * Ad Selection Service
 * Server-side ad selection with proper targeting, frequency control, and rotation
 * 
 * This prevents frontend manipulation and ensures consistent ad delivery
 */
class AdSelectionService {
  /**
   * Select ads for a specific context
   * @param {Object} context - Selection context
   * @returns {Promise<Array>} Selected ads
   */
  async selectAds(context = {}) {
    const {
      placement = 'between_sections',
      pageType = 'all',
      device = 'desktop',
      isLoggedIn = false,
      sessionId = null,
      userId = null,
      categoryId = null,
      articleId = null,
      sectionIndex = null,
      paragraphIndex = null,
      placementId = null,
      adId = null,
      limit = 3,
      excludeAdIds = [],
      country = null,
      pageUrl = ''
    } = context;

    const pageUrlValue = normalizePagePath(pageUrl);
    const hasPageUrl = pageUrlValue.length > 0;
    const now = new Date();
    
    const normalizedPageType = normalizePageType(pageType);
    const pageTypeVariants = normalizedPageType === 'article'
      ? ['article', 'articles']
      : [normalizedPageType];
    const enablePageUrlFilter = placement === 'popup' && hasPageUrl;
    const pageKey = buildPageKey({
      pageType: normalizedPageType,
      pageUrl: pageUrlValue,
      fallback: articleId || categoryId || normalizedPageType
    });
    
    // Build query
    const query = {
      status: 'active',
      _id: { $nin: excludeAdIds }
    };
    if (adId) {
      query._id = adId;
    } else if (placement) {
      query.$or = [
        { placement },
        { placements: placement }
      ];
    }
    
    // Schedule filtering
    query.$and = [
      {
        $or: [
          { 'schedule.startDate': null },
          { 'schedule.startDate': { $lte: now } }
        ]
      },
      {
        $or: [
          { 'schedule.endDate': null },
          { 'schedule.endDate': { $gte: now } }
        ]
      }
    ];
    
    // Page type targeting
    query.$and = query.$and || [];
    const allowCustomPage = placement === 'custom' || Boolean(placementId) || enablePageUrlFilter;
    const pageConditions = [
      { 'targeting.pages': 'all' },
      { 'targeting.pages': { $in: pageTypeVariants } }
    ];
    if (allowCustomPage) {
      pageConditions.push({ 'targeting.pages': 'custom' });
    }
    query.$and.push({ $or: pageConditions });
    if (enablePageUrlFilter) {
      query.$and.push({
        $or: [
          { 'targeting.pages': { $ne: 'custom' } },
          { 'targeting.pageUrls': { $exists: false } },
          { 'targeting.pageUrls': { $size: 0 } },
          { 'targeting.pageUrls': pageUrlValue }
        ]
      });
    }
    
    // Device targeting
    const deviceField = `targeting.devices.${device}`;
    query[deviceField] = true;
    
    // User status targeting
    const userStatusField = isLoggedIn 
      ? 'targeting.userStatus.loggedIn' 
      : 'targeting.userStatus.guest';
    query[userStatusField] = true;
    
    // Placement-specific filters
    if (placement === 'between_sections' && sectionIndex !== null) {
      query.sectionIndex = sectionIndex;
    }
    if (placement === 'in_article' && paragraphIndex !== null) {
      query.paragraphIndex = paragraphIndex;
    }
    if (placementId) {
      query.placementId = placementId;
    }
    
    // Category targeting (if provided)
    if (categoryId) {
      query.$and.push({
        $or: [
          { 'targeting.categories': { $size: 0 } },
          { 'targeting.categories': categoryId }
        ]
      });
      query['targeting.excludeCategories'] = { $ne: categoryId };
    }

    // Article targeting (if provided)
    if (articleId) {
      query.$and.push({
        $or: [
          { 'targeting.articles': { $size: 0 } },
          { 'targeting.articles': articleId }
        ]
      });
    }
    
    const cacheKey = cacheService.key(
      'ads:selection',
      placement,
      normalizedPageType,
      device,
      isLoggedIn ? '1' : '0',
      categoryId || 'na',
      articleId || 'na',
      placementId || 'na',
      country || 'na', // Include country for geo-targeted ads
      enablePageUrlFilter ? (pageUrlValue || 'no-page') : 'no-page',
      limit
    );

    let ads = await cacheService.get(cacheKey);

    if (!ads) {
      ads = await Ad.find(query)
        .sort({ priority: -1, weight: -1, createdAt: -1 })
        .limit(limit * 3) // Fetch extra for frequency filtering
        .lean();
      await cacheService.set(cacheKey, ads, 300); // cache for 5 minutes (improved performance)
    }

    // Apply geo targeting (post-query for simplicity)
    if (country) {
      ads = ads.filter((ad) => {
        const geo = ad.targeting?.geoTargeting || {};
        if (!geo.enabled) return true;
        if (geo.excludeCountries?.includes(country)) return false;
        if (geo.countries && geo.countries.length > 0) {
          return geo.countries.includes(country);
        }
        return true;
      });
    }

    // Apply day/time filtering
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const currentDay = now.getDay();
    ads = ads.filter((ad) => {
      const sched = ad.schedule || {};
      const days = sched.dayOfWeek || [];
      if (days.length > 0 && !days.includes(currentDay)) return false;
      const start = sched.timeStart ? parseInt(sched.timeStart.split(':')[0], 10) * 60 + parseInt(sched.timeStart.split(':')[1] || '0', 10) : null;
      const end = sched.timeEnd ? parseInt(sched.timeEnd.split(':')[0], 10) * 60 + parseInt(sched.timeEnd.split(':')[1] || '0', 10) : null;
      if (start !== null && nowMinutes < start) return false;
      if (end !== null && nowMinutes > end) return false;
      return true;
    });

    if (enablePageUrlFilter) {
      ads = ads.filter((ad) => {
        if (ad.targeting?.pages !== 'custom') return true;
        const urls = Array.isArray(ad.targeting?.pageUrls) ? ad.targeting.pageUrls : [];
        if (urls.length === 0) return true;
        return urls.some((url) => normalizePagePath(url) === pageUrlValue);
      });
    }
    
    // Apply frequency control
    if (ads.length > 0) {
      ads = await this.applyFrequencyControl(ads, { sessionId, userId }, pageKey);
    }
    
    // Apply weighted rotation if multiple ads have same priority
    ads = this.applyWeightedRotation(ads);

    const selectedAds = ads.slice(0, limit);
    if (selectedAds.length > 0) {
      await this.logServedImpressions(selectedAds, {
        sessionId,
        userId,
        pageType: normalizedPageType,
        pageUrl: pageUrlValue,
        pageKey,
        device,
        articleId,
        categoryId,
        placement
      });
    }
    
    // Return limited results
    return selectedAds;
  }
  
  /**
   * Get all ads for homepage with placements
   */
  async getHomepageAds(context = {}) {
    const { device = 'desktop', isLoggedIn = false, sessionId = null, userId = null, country = null } = context;
    
    const placements = ['after_hero', 'between_sections'];
    const result = {};
    
    for (const placement of placements) {
      const ads = await this.selectAds({
        placement,
        pageType: 'homepage',
        device,
        isLoggedIn,
        sessionId,
        userId,
        country,
        limit: placement === 'between_sections' ? 10 : 2
      });
      
      if (placement === 'between_sections') {
        // Group by sectionIndex
        result[placement] = {};
        ads.forEach(ad => {
          const idx = ad.sectionIndex || 0;
          if (!result[placement][idx]) {
            result[placement][idx] = [];
          }
          result[placement][idx].push(ad);
        });
      } else {
        result[placement] = ads;
      }
    }
    
    return result;
  }
  
  /**
   * Get ads for article page
   */
  async getArticleAds(context = {}) {
    const {
      articleId,
      categoryId,
      device = 'desktop',
      isLoggedIn = false,
      sessionId = null,
      userId = null,
      totalParagraphs = 10,
      country = null
    } = context;
    
    const result = {
      in_article: {},
      after_article: [],
      before_comments: []
    };
    
    // Get in-article ads
    const inArticleAds = await this.selectAds({
      placement: 'in_article',
      pageType: 'article',
      device,
      isLoggedIn,
      sessionId,
      userId,
      categoryId,
      articleId,
      country,
      limit: Math.min(5, Math.floor(totalParagraphs / 3)) // Max 1 ad per 3 paragraphs
    });
    
    // Group by paragraphIndex
    inArticleAds.forEach(ad => {
      const idx = ad.paragraphIndex || 3;
      if (!result.in_article[idx]) {
        result.in_article[idx] = [];
      }
      result.in_article[idx].push(ad);
    });
    
    // Get after article ads
    result.after_article = await this.selectAds({
      placement: 'after_article',
      pageType: 'article',
      device,
      isLoggedIn,
      sessionId,
      userId,
      categoryId,
      country,
      limit: 2
    });
    
    // Get before comments ads
    result.before_comments = await this.selectAds({
      placement: 'before_comments',
      pageType: 'article',
      device,
      isLoggedIn,
      sessionId,
      userId,
      categoryId,
      country,
      limit: 1
    });
    
    return result;
  }
  
  /**
   * Get ads for category page
   */
  async getCategoryAds(context = {}) {
    const {
      categoryId,
      device = 'desktop',
      isLoggedIn = false,
      sessionId = null,
      userId = null,
      country = null
    } = context;
    
    return this.selectAds({
      placement: 'in_category',
      pageType: 'category',
      device,
      isLoggedIn,
      sessionId,
      userId,
      country,
      categoryId,
      limit: 3
    });
  }
  
  /**
   * Apply frequency control based on session
   */
  async applyFrequencyControl(ads, identity, pageKey) {
    if (ads.length === 0) return ads;

    const adIds = ads.map((ad) => ad._id);
    const globalCountsRaw = await AdEvent.aggregate([
      { $match: { adId: { $in: adIds.map((id) => new mongoose.Types.ObjectId(id)) } } },
      {
        $group: {
          _id: { adId: '$adId', type: '$type' },
          count: { $sum: 1 },
        },
      },
    ]);
    const globalCounts = new Map();
    globalCountsRaw.forEach((row) => {
      const key = row._id.adId.toString();
      const current = globalCounts.get(key) || { impressions: 0, clicks: 0 };
      if (row._id.type === 'impression') current.impressions = row.count;
      if (row._id.type === 'click') current.clicks = row.count;
      globalCounts.set(key, current);
    });

    const { sessionId, userId } = identity || {};
    if (!sessionId && !userId) {
      return ads.filter((ad) => {
        const maxImpr = ad.frequency?.maxImpressions || 0;
        const maxClicks = ad.frequency?.maxClicks || 0;
        const global = globalCounts.get(ad._id.toString()) || { impressions: 0, clicks: 0 };
        if (maxImpr > 0 && global.impressions >= maxImpr) return false;
        if (maxClicks > 0 && global.clicks >= maxClicks) return false;
        return true;
      });
    }

    const baseMatch = { adId: { $in: adIds }, type: 'impression' };
    const [userEvents, sessionEvents] = await Promise.all([
      userId
        ? AdEvent.find({ ...baseMatch, userId }).select('adId pageKey createdAt').lean()
        : [],
      sessionId
        ? AdEvent.find({ ...baseMatch, sessionId }).select('adId pageKey createdAt').lean()
        : []
    ]);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const buildStats = (events) => {
      const counts = new Map();
      const pages = new Map();
      events.forEach((evt) => {
        const key = evt.adId.toString();
        const current = counts.get(key) || { impressions: 0, day: 0 };
        current.impressions += 1;
        if (evt.createdAt && evt.createdAt >= startOfDay) current.day += 1;
        counts.set(key, current);

        if (evt.pageKey) {
          const seen = pages.get(key) || new Set();
          seen.add(evt.pageKey);
          pages.set(key, seen);
        }
      });
      return { counts, pages };
    };

    const userStats = buildStats(userEvents);
    const sessionStats = buildStats(sessionEvents);
    const filteredAds = [];

    for (const ad of ads) {
      const frequency = ad.frequency?.type || 'unlimited';
      const maxImpr = ad.frequency?.maxImpressions || 0;
      const maxClicks = ad.frequency?.maxClicks || 0;
      const global = globalCounts.get(ad._id.toString()) || { impressions: 0, clicks: 0 };

      if (maxImpr > 0 && global.impressions >= maxImpr) continue;
      if (maxClicks > 0 && global.clicks >= maxClicks) continue;

      const adKey = ad._id.toString();
      const userCount = userStats.counts.get(adKey) || { impressions: 0, day: 0 };
      const sessionCount = sessionStats.counts.get(adKey) || { impressions: 0, day: 0 };
      const userPages = userStats.pages.get(adKey) || new Set();
      const sessionPages = sessionStats.pages.get(adKey) || new Set();

      switch (frequency) {
        case 'unlimited':
          filteredAds.push(ad);
          break;
        case 'once_per_user': {
          const stats = userId ? userCount : sessionCount;
          if (stats.impressions > 0) break;
          filteredAds.push(ad);
          break;
        }
        case 'once_per_session': {
          const stats = sessionId ? sessionCount : userCount;
          if (stats.impressions > 0) break;
          filteredAds.push(ad);
          break;
        }
        case 'once_per_day': {
          const stats = userId ? userCount : sessionCount;
          if (stats.day > 0) break;
          filteredAds.push(ad);
          break;
        }
        case 'once_per_page': {
          const seenPages = userId ? userPages : sessionPages;
          if (pageKey && seenPages.has(pageKey)) break;
          filteredAds.push(ad);
          break;
        }
        default:
          filteredAds.push(ad);
          break;
      }
    }

    return filteredAds;
  }
  
  /**
   * Apply weighted rotation for ads with same priority
   */
  applyWeightedRotation(ads) {
    if (ads.length <= 1) return ads;
    
    // Group by priority
    const groups = {};
    ads.forEach(ad => {
      const priority = ad.priority || 0;
      if (!groups[priority]) groups[priority] = [];
      groups[priority].push(ad);
    });
    
    // Shuffle within each priority group based on weight
    const result = [];
    Object.keys(groups)
      .sort((a, b) => b - a) // Descending priority
      .forEach(priority => {
        const group = groups[priority];
        if (group.length > 1) {
          // Weighted shuffle
          const shuffled = this.weightedShuffle(group);
          result.push(...shuffled);
        } else {
          result.push(...group);
        }
      });
    
    return result;
  }
  
  /**
   * Weighted shuffle algorithm
   */
  weightedShuffle(items) {
    const weighted = items.map(item => ({
      item,
      weight: item.weight || 100,
      random: Math.random()
    }));
    
    // Sort by weight * random for weighted randomization
    weighted.sort((a, b) => (b.weight * b.random) - (a.weight * a.random));
    
    return weighted.map(w => w.item);
  }

  async logServedImpressions(ads, context = {}) {
    if (!Array.isArray(ads) || ads.length === 0) return;
    const tasks = ads.map((ad) =>
      this.trackImpression(ad._id, {
        ...context,
        placement: context.placement || ad.placement
      })
    );
    await Promise.allSettled(tasks);
  }
  
  /**
   * Track ad impression
   */
  async trackImpression(adId, context = {}) {
    const {
      sessionId,
      userId,
      pageType = 'other',
      pageUrl = '',
      pageKey,
      device = 'desktop',
      articleId = null,
      categoryId = null,
      placement = '',
      ipHash = ''
    } = context;

    const normalizedPageType = normalizePageType(pageType);
    const normalizedPageUrl = normalizePagePath(pageUrl);
    const resolvedPageKey = pageKey || buildPageKey({
      pageType: normalizedPageType,
      pageUrl: normalizedPageUrl,
      fallback: articleId || categoryId || normalizedPageType
    });
    const identityKey = buildIdentityKey({ userId, sessionId });
    const dedupeKey = buildDedupeKey({
      type: 'impression',
      adId,
      pageKey: resolvedPageKey,
      identityKey
    });

    return AdEvent.logEvent({
      adId,
      type: 'impression',
      sessionId,
      userId,
      pageType: normalizedPageType,
      pageUrl: normalizedPageUrl,
      pageKey: resolvedPageKey,
      device,
      articleId,
      categoryId,
      placement,
      dedupeKey,
      ipHash
    });
  }
  
  /**
   * Track ad click
   */
  async trackClick(adId, context = {}) {
    const {
      sessionId,
      userId,
      pageType = 'other',
      pageUrl = '',
      pageKey,
      device = 'desktop',
      articleId = null,
      categoryId = null,
      placement = '',
      eventId,
      ipHash = ''
    } = context;

    const normalizedPageType = normalizePageType(pageType);
    const normalizedPageUrl = normalizePagePath(pageUrl);
    const resolvedPageKey = pageKey || buildPageKey({
      pageType: normalizedPageType,
      pageUrl: normalizedPageUrl,
      fallback: articleId || categoryId || normalizedPageType
    });
    const identityKey = buildIdentityKey({ userId, sessionId });
    const dedupeKey = buildDedupeKey({
      type: 'click',
      adId,
      pageKey: resolvedPageKey,
      identityKey,
      eventId
    });

    return AdEvent.logEvent({
      adId,
      type: 'click',
      sessionId,
      userId,
      pageType: normalizedPageType,
      pageUrl: normalizedPageUrl,
      pageKey: resolvedPageKey,
      device,
      articleId,
      categoryId,
      placement,
      dedupeKey,
      ipHash
    });
  }
}

export default new AdSelectionService();
