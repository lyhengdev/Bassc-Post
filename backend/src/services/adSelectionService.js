import Ad from '../models/Ad.js';
import AdEvent from '../models/AdEvent.js';

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
      categoryId = null,
      articleId = null,
      sectionIndex = null,
      paragraphIndex = null,
      limit = 3,
      excludeAdIds = []
    } = context;
    
    const now = new Date();
    
    // Build query
    const query = {
      status: 'active',
      placement,
      _id: { $nin: excludeAdIds }
    };
    
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
    query.$or = [
      { 'targeting.pages': 'all' },
      { 'targeting.pages': pageType }
    ];
    
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
    
    // Fetch matching ads
    let ads = await Ad.find(query)
      .sort({ priority: -1, weight: -1, createdAt: -1 })
      .limit(limit * 3) // Fetch extra for frequency filtering
      .lean();
    
    // Apply frequency control
    if (sessionId && ads.length > 0) {
      ads = await this.applyFrequencyControl(ads, sessionId);
    }
    
    // Apply weighted rotation if multiple ads have same priority
    ads = this.applyWeightedRotation(ads);
    
    // Return limited results
    return ads.slice(0, limit);
  }
  
  /**
   * Get all ads for homepage with placements
   */
  async getHomepageAds(context = {}) {
    const { device = 'desktop', isLoggedIn = false, sessionId = null } = context;
    
    const placements = ['after_hero', 'between_sections'];
    const result = {};
    
    for (const placement of placements) {
      const ads = await this.selectAds({
        placement,
        pageType: 'homepage',
        device,
        isLoggedIn,
        sessionId,
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
      totalParagraphs = 10
    } = context;
    
    const result = {
      in_article: {},
      after_article: [],
      before_comments: []
    };
    
    // Get in-article ads
    const inArticleAds = await this.selectAds({
      placement: 'in_article',
      pageType: 'articles',
      device,
      isLoggedIn,
      sessionId,
      categoryId,
      articleId,
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
      pageType: 'articles',
      device,
      isLoggedIn,
      sessionId,
      categoryId,
      limit: 2
    });
    
    // Get before comments ads
    result.before_comments = await this.selectAds({
      placement: 'before_comments',
      pageType: 'articles',
      device,
      isLoggedIn,
      sessionId,
      categoryId,
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
      sessionId = null
    } = context;
    
    return this.selectAds({
      placement: 'in_category',
      pageType: 'category',
      device,
      isLoggedIn,
      sessionId,
      categoryId,
      limit: 3
    });
  }
  
  /**
   * Apply frequency control based on session
   */
  async applyFrequencyControl(ads, sessionId) {
    if (!sessionId || ads.length === 0) return ads;
    
    const filteredAds = [];
    
    for (const ad of ads) {
      const frequency = ad.frequency?.type || 'unlimited';
      
      if (frequency === 'unlimited') {
        filteredAds.push(ad);
        continue;
      }
      
      const hasSeen = await AdEvent.hasSeenAd(sessionId, ad._id, frequency);
      if (!hasSeen) {
        filteredAds.push(ad);
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
  
  /**
   * Track ad impression
   */
  async trackImpression(adId, context = {}) {
    const {
      sessionId,
      userId,
      pageType = 'other',
      pageUrl = '',
      device = 'desktop',
      articleId = null,
      categoryId = null,
      placement = ''
    } = context;
    
    return AdEvent.logEvent({
      adId,
      type: 'impression',
      sessionId,
      userId,
      pageType,
      pageUrl,
      device,
      articleId,
      categoryId,
      placement
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
      device = 'desktop',
      articleId = null,
      categoryId = null,
      placement = ''
    } = context;
    
    return AdEvent.logEvent({
      adId,
      type: 'click',
      sessionId,
      userId,
      pageType,
      pageUrl,
      device,
      articleId,
      categoryId,
      placement
    });
  }
}

export default new AdSelectionService();
