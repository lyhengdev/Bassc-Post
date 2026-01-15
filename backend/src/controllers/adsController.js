import Ad from '../models/Ad.js';
import AdEvent from '../models/AdEvent.js';
import AdStatsDaily from '../models/AdStatsDaily.js';
import adSelectionService from '../services/adSelectionService.js';
import sanitizationService from '../services/sanitizationService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { createdResponse, successResponse, errorResponse } from '../utils/apiResponse.js';

/**
 * Get all ads (admin)
 * GET /api/ads
 */
export const getAllAds = asyncHandler(async (req, res) => {
  const {
    status,
    placement,
    page = 1,
    limit = 20,
    sort = '-createdAt'
  } = req.query;
  
  const query = {};
  if (status) query.status = status;
  if (placement) query.placement = placement;
  
  const skip = (page - 1) * limit;
  
  const [ads, total] = await Promise.all([
    Ad.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'name email')
      .lean(),
    Ad.countDocuments(query)
  ]);
  
  return successResponse(res, {
    ads,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

/**
 * Get single ad (admin)
 * GET /api/ads/:id
 */
export const getAd = asyncHandler(async (req, res) => {
  const ad = await Ad.findById(req.params.id)
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');
  
  if (!ad) {
    return errorResponse(res, 'Ad not found', 404);
  }
  
  return successResponse(res, { ad });
});

/**
 * Create new ad (admin)
 * POST /api/ads
 */
export const createAd = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  
  // Sanitize HTML content
  if (data.htmlContent) {
    data.htmlContent = sanitizationService.adHtml(data.htmlContent);
  }
  
  // Validate URLs
  if (data.imageUrl) {
    data.imageUrl = sanitizationService.url(data.imageUrl, 'image');
  }
  if (data.mobileImageUrl) {
    data.mobileImageUrl = sanitizationService.url(data.mobileImageUrl, 'image');
  }
  if (data.linkUrl) {
    data.linkUrl = sanitizationService.url(data.linkUrl, 'link');
  }
  
  data.createdBy = req.user._id;
  data.updatedBy = req.user._id;
  
  const ad = await Ad.create(data);
  
  return createdResponse(res, { ad }, 'Ad created');
});

/**
 * Update ad (admin)
 * PUT /api/ads/:id
 */
export const updateAd = asyncHandler(async (req, res) => {
  const ad = await Ad.findById(req.params.id);
  
  if (!ad) {
    return errorResponse(res, 'Ad not found', 404);
  }
  
  const data = { ...req.body };
  
  // Sanitize HTML content
  if (data.htmlContent !== undefined) {
    data.htmlContent = sanitizationService.adHtml(data.htmlContent);
  }
  
  // Validate URLs
  if (data.imageUrl !== undefined) {
    data.imageUrl = sanitizationService.url(data.imageUrl, 'image');
  }
  if (data.mobileImageUrl !== undefined) {
    data.mobileImageUrl = sanitizationService.url(data.mobileImageUrl, 'image');
  }
  if (data.linkUrl !== undefined) {
    data.linkUrl = sanitizationService.url(data.linkUrl, 'link');
  }
  
  data.updatedBy = req.user._id;
  
  // Prevent overwriting certain fields
  delete data.createdBy;
  delete data.stats; // Stats are updated by aggregation only
  
  Object.assign(ad, data);
  await ad.save();
  
  return successResponse(res, { ad });
});

/**
 * Delete ad (admin)
 * DELETE /api/ads/:id
 */
export const deleteAd = asyncHandler(async (req, res) => {
  const ad = await Ad.findById(req.params.id);
  
  if (!ad) {
    return errorResponse(res, 'Ad not found', 404);
  }
  
  await ad.deleteOne();
  
  return successResponse(res, { message: 'Ad deleted successfully' });
});

/**
 * Duplicate ad (admin)
 * POST /api/ads/:id/duplicate
 */
export const duplicateAd = asyncHandler(async (req, res) => {
  const original = await Ad.findById(req.params.id).lean();
  
  if (!original) {
    return errorResponse(res, 'Ad not found', 404);
  }
  
  // Remove fields that shouldn't be duplicated
  delete original._id;
  delete original.slug;
  delete original.stats;
  delete original.createdAt;
  delete original.updatedAt;
  
  // Update metadata
  original.name = `${original.name} (Copy)`;
  original.status = 'draft';
  original.createdBy = req.user._id;
  original.updatedBy = req.user._id;
  
  const ad = await Ad.create(original);
  
  return createdResponse(res, { ad }, 'Ad duplicated');
});

/**
 * Select ads for display (public API)
 * GET /api/ads/select
 */
export const selectAds = asyncHandler(async (req, res) => {
  const {
    placement = 'between_sections',
    pageType = 'all',
    device = 'desktop',
    sectionIndex,
    paragraphIndex,
    placementId,
    adId,
    categoryId,
    articleId,
    limit = 3
  } = req.query;
  
  // Get session ID from cookie or generate one
  const sessionId = req.cookies?.sessionId || req.headers['x-session-id'];
  const isLoggedIn = !!req.user;
  
  const ads = await adSelectionService.selectAds({
    placement,
    pageType,
    device,
    isLoggedIn,
    sessionId,
    categoryId,
    articleId,
    sectionIndex: sectionIndex ? parseInt(sectionIndex) : null,
    paragraphIndex: paragraphIndex ? parseInt(paragraphIndex) : null,
    placementId,
    adId,
    limit: parseInt(limit)
  });
  
  // Return only public fields
  const publicAds = ads.map(ad => ({
    _id: ad._id,
    type: ad.type,
    imageUrl: ad.imageUrl,
    mobileImageUrl: ad.mobileImageUrl,
    imageUrls: ad.imageUrls,
    linkUrl: ad.linkUrl,
    linkTarget: ad.linkTarget,
    htmlContent: ad.htmlContent,
    videoUrl: ad.videoUrl,
    altText: ad.altText,
    title: ad.title,
    description: ad.description,
    ctaText: ad.ctaText,
    autoCloseSeconds: ad.autoCloseSeconds,
    slideIntervalMs: ad.slideIntervalMs,
    style: ad.style,
    size: ad.size,
    alignment: ad.alignment,
    maxWidth: ad.maxWidth,
    backgroundColor: ad.backgroundColor,
    borderRadius: ad.borderRadius,
    padding: ad.padding,
    showLabel: ad.showLabel,
    labelText: ad.labelText,
    animation: ad.animation,
    placement: ad.placement,
    placements: ad.placements,
    sectionIndex: ad.sectionIndex,
    paragraphIndex: ad.paragraphIndex
  }));
  
  return successResponse(res, { ads: publicAds });
});

/**
 * Get ads for homepage (public API)
 * GET /api/ads/homepage
 */
export const getHomepageAds = asyncHandler(async (req, res) => {
  const { device = 'desktop' } = req.query;
  const sessionId = req.cookies?.sessionId || req.headers['x-session-id'];
  const isLoggedIn = !!req.user;
  
  const ads = await adSelectionService.getHomepageAds({
    device,
    isLoggedIn,
    sessionId
  });
  
  return successResponse(res, { ads });
});

/**
 * Get ads for article page (public API)
 * GET /api/ads/article/:articleId
 */
export const getArticleAds = asyncHandler(async (req, res) => {
  const { articleId } = req.params;
  const { device = 'desktop', categoryId, totalParagraphs = 10 } = req.query;
  const sessionId = req.cookies?.sessionId || req.headers['x-session-id'];
  const isLoggedIn = !!req.user;
  
  const ads = await adSelectionService.getArticleAds({
    articleId,
    categoryId,
    device,
    isLoggedIn,
    sessionId,
    totalParagraphs: parseInt(totalParagraphs)
  });
  
  return successResponse(res, { ads });
});

/**
 * Track ad event (public API)
 * POST /api/ads/event
 */
export const trackEvent = asyncHandler(async (req, res) => {
  const { adId, type, pageType, pageUrl, device, articleId, categoryId, placement } = req.body;
  
  if (!adId || !type) {
    return errorResponse(res, 'adId and type are required', 400);
  }
  
  if (!['impression', 'click'].includes(type)) {
    return errorResponse(res, 'Invalid event type', 400);
  }
  
  const sessionId = req.cookies?.sessionId || req.headers['x-session-id'];
  const userId = req.user?._id;
  
  const context = {
    sessionId,
    userId,
    pageType: pageType || 'other',
    pageUrl: pageUrl || '',
    device: device || 'desktop',
    articleId,
    categoryId,
    placement
  };
  
  if (type === 'impression') {
    await adSelectionService.trackImpression(adId, context);
  } else if (type === 'click') {
    await adSelectionService.trackClick(adId, context);
  }
  
  return successResponse(res, { success: true });
});

/**
 * Get ad statistics (admin)
 * GET /api/ads/:id/stats
 */
export const getAdStats = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { startDate, endDate, breakdown = false } = req.query;
  
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();
  
  let stats = await AdStatsDaily.getStatsForAd(id, start, end);
  if (!stats || (stats.impressions === 0 && stats.clicks === 0)) {
    stats = await AdEvent.getAdStats(id, start, end);
  }
  
  let daily = [];
  if (breakdown === 'true') {
    daily = await AdStatsDaily.getDailyBreakdown(id, start, end);
  }
  
  return successResponse(res, { stats, daily });
});

/**
 * Get all ads statistics summary (admin)
 * GET /api/ads/stats/summary
 */
export const getAllAdsStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();
  
  let stats = await AdStatsDaily.getAllAdsStats(start, end);
  if (!stats || stats.length === 0) {
    stats = await AdEvent.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: { adId: '$adId', type: '$type' },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.adId',
          impressions: {
            $sum: {
              $cond: [{ $eq: ['$_id.type', 'impression'] }, '$count', 0]
            }
          },
          clicks: {
            $sum: {
              $cond: [{ $eq: ['$_id.type', 'click'] }, '$count', 0]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'ads',
          localField: '_id',
          foreignField: '_id',
          as: 'ad'
        }
      },
      { $unwind: '$ad' },
      {
        $project: {
          adId: '$_id',
          name: '$ad.name',
          status: '$ad.status',
          placement: '$ad.placement',
          impressions: 1,
          clicks: 1,
          ctr: {
            $cond: [
              { $gt: ['$impressions', 0] },
              { $round: [{ $multiply: [{ $divide: ['$clicks', '$impressions'] }, 100] }, 2] },
              0
            ]
          }
        }
      },
      { $sort: { impressions: -1 } }
    ]);
  }
  
  return successResponse(res, { stats });
});

/**
 * Bulk update ad status (admin)
 * PATCH /api/ads/bulk/status
 */
export const bulkUpdateStatus = asyncHandler(async (req, res) => {
  const { adIds, status } = req.body;
  
  if (!adIds || !Array.isArray(adIds) || adIds.length === 0) {
    return errorResponse(res, 'adIds array is required', 400);
  }
  
  if (!['draft', 'active', 'paused', 'archived'].includes(status)) {
    return errorResponse(res, 'Invalid status', 400);
  }
  
  const result = await Ad.updateMany(
    { _id: { $in: adIds } },
    { 
      status, 
      updatedBy: req.user._id,
      updatedAt: new Date()
    }
  );
  
  return successResponse(res, { 
    updated: result.modifiedCount,
    message: `${result.modifiedCount} ads updated to ${status}`
  });
});

export default {
  getAllAds,
  getAd,
  createAd,
  updateAd,
  deleteAd,
  duplicateAd,
  selectAds,
  getHomepageAds,
  getArticleAds,
  trackEvent,
  getAdStats,
  getAllAdsStats,
  bulkUpdateStatus
};
