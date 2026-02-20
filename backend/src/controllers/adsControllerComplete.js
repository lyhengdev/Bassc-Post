import crypto from 'crypto';
import Ad from '../models/Ad.js';
import AdCollection from '../models/AdCollection.js';
import AdEvent from '../models/AdEvent.js';
import AdStatsDaily from '../models/AdStatsDaily.js';
import mongoose from 'mongoose';
import {
  buildDedupeKey,
  buildIdentityKey,
  buildPageKey,
  normalizePagePath,
  normalizePageType,
} from '../utils/adTracking.js';
import { getClientIp, hashIp } from '../utils/fraudDetection.js';

/**
 * COMPLETE ADS CONTROLLER - FIXED VERSION 6/6
 * 
 * Features:
 * - Collection CRUD
 * - Ad CRUD
 * - Bulk operations
 * - Serving & tracking with FREQUENCY CONTROL ✅
 * - Analytics
 * - Templates
 * 
 * FIXES APPLIED (Jan 23, 2026):
 * ✅ Added frequency control to selectCollection
 * ✅ Added session management in ad selection
 * ✅ Added max impressions/clicks enforcement
 * ✅ Added pageUrl capture for once_per_page frequency
 * ✅ Added proper error messages and reasons
 */

const ensureSessionId = (req, res) => {
  let sessionId = req.cookies?.sessionId || req.headers['x-session-id'];
  if (!sessionId) {
    sessionId = crypto.randomBytes(16).toString('hex');
    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }
  return sessionId;
};

// ==================== COLLECTIONS ====================

/**
 * Get all collections
 * GET /api/ad-collections
 */
export const getAllCollections = async (req, res) => {
  try {
    const { status, placement, search, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status && status !== 'all') query.status = status;
    if (placement && placement !== 'all') query.placement = placement;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [collections, total] = await Promise.all([
      AdCollection.find(query)
        .populate('createdBy', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      AdCollection.countDocuments(query),
    ]);

    const collectionsWithCounts = await Promise.all(
      collections.map(async (collection) => {
        const adsCount = await Ad.countDocuments({
          collectionId: collection._id,
          status: { $ne: 'deleted' },
        });
        const activeAdsCount = await Ad.countDocuments({
          collectionId: collection._id,
          status: 'active',
        });

        return {
          ...collection,
          adsCount,
          activeAdsCount,
        };
      })
    );

    res.json({
      success: true,
      collections: collectionsWithCounts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get collections error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch collections',
      error: error.message,
    });
  }
};

/**
 * Get single collection
 * GET /api/ad-collections/:id
 */
export const getCollection = async (req, res) => {
  try {
    const collection = await AdCollection.findById(req.params.id)
      .populate('createdBy', 'fullName email')
      .populate('updatedBy', 'fullName email')
      .lean();

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found',
      });
    }

    // Get ads count
    const adsCount = await Ad.countDocuments({
      collectionId: collection._id,
      status: { $ne: 'deleted' },
    });

    res.json({
      success: true,
      collection: {
        ...collection,
        adsCount,
      },
    });
  } catch (error) {
    console.error('Get collection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch collection',
      error: error.message,
    });
  }
};

/**
 * Create collection
 * POST /api/ad-collections
 */
export const createCollection = async (req, res) => {
  try {
    const collectionData = {
      ...req.body,
      createdBy: req.user._id,
    };

    const collection = await AdCollection.create(collectionData);

    res.status(201).json({
      success: true,
      message: 'Collection created successfully',
      collection,
    });
  } catch (error) {
    console.error('Create collection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create collection',
      error: error.message,
    });
  }
};

/**
 * Update collection
 * PUT /api/ad-collections/:id
 */
export const updateCollection = async (req, res) => {
  try {
    const collection = await AdCollection.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updatedBy: req.user._id,
      },
      { new: true, runValidators: true }
    );

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found',
      });
    }

    res.json({
      success: true,
      message: 'Collection updated successfully',
      collection,
    });
  } catch (error) {
    console.error('Update collection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update collection',
      error: error.message,
    });
  }
};

/**
 * Delete collection
 * DELETE /api/ad-collections/:id
 */
export const deleteCollection = async (req, res) => {
  try {
    const collection = await AdCollection.findByIdAndDelete(req.params.id);

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found',
      });
    }

    // Delete all ads in collection
    await Ad.updateMany(
      { collectionId: req.params.id },
      { status: 'deleted' }
    );

    res.json({
      success: true,
      message: 'Collection deleted successfully',
    });
  } catch (error) {
    console.error('Delete collection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete collection',
      error: error.message,
    });
  }
};

/**
 * Duplicate collection
 * POST /api/ad-collections/:id/duplicate
 */
export const duplicateCollection = async (req, res) => {
  try {
    const original = await AdCollection.findById(req.params.id).lean();

    if (!original) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found',
      });
    }

    // Create duplicate
    const duplicate = await AdCollection.create({
      ...original,
      _id: undefined,
      name: `${original.name} (Copy)`,
      createdBy: req.user._id,
      createdAt: undefined,
      updatedAt: undefined,
    });

    // Duplicate ads
    const originalAds = await Ad.find({
      collectionId: original._id,
      status: { $ne: 'deleted' },
    }).lean();

    if (originalAds.length > 0) {
      const duplicatedAds = originalAds.map(ad => ({
        ...ad,
        _id: undefined,
        collectionId: duplicate._id,
        stats: {
          impressions: 0,
          clicks: 0,
          ctr: 0,
          lastServed: null,
        },
        createdBy: req.user._id,
        createdAt: undefined,
        updatedAt: undefined,
      }));

      await Ad.insertMany(duplicatedAds);
    }

    res.status(201).json({
      success: true,
      message: 'Collection duplicated successfully',
      collection: duplicate,
    });
  } catch (error) {
    console.error('Duplicate collection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to duplicate collection',
      error: error.message,
    });
  }
};

/**
 * Update collection stats
 * POST /api/ad-collections/:id/update-stats
 */
export const updateCollectionStats = async (req, res) => {
  try {
    const collection = await AdCollection.findById(req.params.id);

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found',
      });
    }

    await collection.updateStats();

    res.json({
      success: true,
      message: 'Stats updated successfully',
      stats: collection.stats,
    });
  } catch (error) {
    console.error('Update stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update stats',
      error: error.message,
    });
  }
};

/**
 * Get collection analytics
 * GET /api/ad-collections/:id/analytics
 */
export const getCollectionAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const collection = await AdCollection.findById(req.params.id);

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found',
      });
    }

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Get ads in collection
    const ads = await Ad.find({
      collectionId: collection._id,
      status: 'active',
    });

    // Get events for date range
    const events = await AdEvent.find({
      adId: { $in: ads.map(a => a._id) },
      createdAt: { $gte: start, $lte: end },
    });

    // Calculate analytics
    const analytics = {
      totalImpressions: events.filter(e => e.type === 'impression').length,
      totalClicks: events.filter(e => e.type === 'click').length,
      ctr: 0,
      adPerformance: [],
      dailyStats: [],
    };

    analytics.ctr = analytics.totalImpressions > 0
      ? ((analytics.totalClicks / analytics.totalImpressions) * 100).toFixed(2)
      : 0;

    // Ad performance
    analytics.adPerformance = ads.map(ad => {
      const adEvents = events.filter(e => e.adId.toString() === ad._id.toString());
      const impressions = adEvents.filter(e => e.type === 'impression').length;
      const clicks = adEvents.filter(e => e.type === 'click').length;

      return {
        adId: ad._id,
        name: ad.name,
        impressions,
        clicks,
        ctr: impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : 0,
      };
    });

    res.json({
      success: true,
      analytics,
      dateRange: { start, end },
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message,
    });
  }
};

/**
 * Select collection for serving (PUBLIC)
 * GET /api/ad-collections/select
 * 
 * FIXED VERSION - Now includes:
 * - Frequency control
 * - Session management
 * - Max impressions/clicks enforcement
 * - PageUrl capture
 */
export const selectCollection = async (req, res) => {
  try {
    const {
      placement,
      pageType,
      page,
      device = 'desktop',
      placementId,
      sectionIndex,
      categoryId,
      pageUrl = '',
      articleId,
      limit = 1,
      excludeCollectionIds,
      excludeAdIds,
    } = req.query;
    const resolvedPageType = pageType || page || 'other';
    const country = req.headers['cf-ipcountry'] || req.query.country || 'all';
    const resolvedLimit = Math.max(1, Math.min(10, parseInt(limit, 10) || 1));
    const resolvedSectionIndex = sectionIndex === undefined || sectionIndex === null || sectionIndex === ''
      ? null
      : Number.parseInt(sectionIndex, 10);

    if (!placement) {
      return res.status(400).json({
        success: false,
        message: 'Placement is required',
      });
    }

    // ✅ FIX #1: Ensure sessionId exists (for frequency control)
    const sessionId = ensureSessionId(req, res);
    const userId = req.user?._id;

    const context = {
      pageType: resolvedPageType,
      device,
      country,
      isLoggedIn: !!req.user,
      categoryId,
      placementId,
      sectionIndex: Number.isNaN(resolvedSectionIndex) ? null : resolvedSectionIndex,
    };

    // Find active collections
    let collections = await AdCollection.findActiveForPlacement(placement, context);
    if (excludeCollectionIds) {
      const excluded = String(excludeCollectionIds)
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
      if (excluded.length) {
        collections = collections.filter((collection) => !excluded.includes(collection._id.toString()));
      }
    }

    if (collections.length === 0) {
      return res.json({
        success: true,
        ad: null,
        reason: 'no_matching_collections',
      });
    }

    const normalizedPageUrl = normalizePagePath(pageUrl);
    const normalizedPageType = normalizePageType(resolvedPageType);
    const pageKey = buildPageKey({
      pageType: normalizedPageType,
      pageUrl: normalizedPageUrl,
      fallback: articleId || categoryId || normalizedPageType,
    });

    const identity = { sessionId, userId };
    const selectedAds = [];
    const selectedCollections = [];

    for (const collection of collections) {
      if (selectedAds.length >= resolvedLimit) break;

      const hasSeenRecently = await AdEvent.hasSeenCollection(
        identity,
        collection._id,
        collection.frequency?.type || 'once_per_session',
        pageKey
      );

      if (hasSeenRecently) {
        continue;
      }

      if (collection.frequency?.maxImpressions > 0 || collection.frequency?.maxClicks > 0) {
        const stats = await AdEvent.getCollectionStats(collection._id);

        if (collection.frequency.maxImpressions > 0 && 
            stats.impressions >= collection.frequency.maxImpressions) {
          continue;
        }

        if (collection.frequency.maxClicks > 0 && 
            stats.clicks >= collection.frequency.maxClicks) {
          continue;
        }
      }

      const adQuery = {
        collectionId: collection._id,
        status: 'active',
      };
      if (excludeAdIds) {
        const excludedAds = String(excludeAdIds)
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean);
        if (excludedAds.length) {
          adQuery._id = { $nin: excludedAds };
        }
      }

      const ads = await Ad.find(adQuery).lean();

      if (ads.length === 0) {
        continue;
      }

      let selectedAd;
      switch (collection.rotationType) {
        case 'random':
          selectedAd = ads[Math.floor(Math.random() * ads.length)];
          break;
        case 'sequential':
          selectedAd = ads[0];
          break;
        case 'weighted': {
          const totalWeight = ads.reduce((sum, ad) => sum + (ad.weight || 50), 0);
          let random = Math.random() * totalWeight;
          for (const ad of ads) {
            random -= (ad.weight || 50);
            if (random <= 0) {
              selectedAd = ad;
              break;
            }
          }
          if (!selectedAd) selectedAd = ads[0];
          break;
        }
        case 'ab_test':
          selectedAd = ads[Math.floor(Math.random() * ads.length)];
          break;
        default:
          selectedAd = ads[0];
      }

      selectedAd.servedPlacement = placement;
      selectedAd.servedAt = new Date();
      selectedAds.push(selectedAd);
      selectedCollections.push({
        _id: collection._id,
        name: collection.name,
        placement: collection.placement,
        placementId: collection.placementId || '',
        sectionIndex: Number.isInteger(collection.sectionIndex) ? collection.sectionIndex : null,
        rotationType: collection.rotationType,
        popupSettings: collection.popupSettings,
      });
    }

    const firstAd = selectedAds[0] || null;
    const firstCollection = selectedCollections[0] || null;

    res.json({
      success: true,
      data: {
        ad: firstAd,
        collection: firstCollection,
        ads: selectedAds,
        collections: selectedCollections,
      },
    });
  } catch (error) {
    console.error('Select collection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to select ad',
      error: error.message,
    });
  }
};

// ==================== ADS ====================

/**
 * Get ads in collection
 * GET /api/ad-collections/:collectionId/ads
 */
export const getAds = async (req, res) => {
  try {
    const { collectionId } = req.params;

    const collection = await AdCollection.findById(collectionId);
    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found',
      });
    }

    const ads = await Ad.find({
      collectionId,
      status: { $ne: 'deleted' },
    })
      .populate('createdBy', 'fullName email')
      .sort({ order: 1, createdAt: 1 })
      .lean();

    res.json({
      success: true,
      ads,
    });
  } catch (error) {
    console.error('Get ads error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ads',
      error: error.message,
    });
  }
};

/**
 * Get single ad
 * GET /api/ads/:id
 */
export const getAd = async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.id)
      .populate('collectionId', 'name placement')
      .populate('createdBy', 'fullName email')
      .lean();

    if (!ad || ad.status === 'deleted') {
      return res.status(404).json({
        success: false,
        message: 'Ad not found',
      });
    }

    res.json({
      success: true,
      ad,
    });
  } catch (error) {
    console.error('Get ad error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ad',
      error: error.message,
    });
  }
};

/**
 * Create ad
 * POST /api/ad-collections/:collectionId/ads
 */
export const createAd = async (req, res) => {
  try {
    const { collectionId } = req.params;

    const collection = await AdCollection.findById(collectionId);
    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found',
      });
    }

    const ad = await Ad.create({
      ...req.body,
      collectionId,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Ad created successfully',
      ad,
    });
  } catch (error) {
    console.error('Create ad error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create ad',
      error: error.message,
    });
  }
};

/**
 * Update ad
 * PUT /api/ads/:id
 */
export const updateAd = async (req, res) => {
  try {
    const ad = await Ad.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updatedBy: req.user._id,
      },
      { new: true, runValidators: true }
    );

    if (!ad || ad.status === 'deleted') {
      return res.status(404).json({
        success: false,
        message: 'Ad not found',
      });
    }

    res.json({
      success: true,
      message: 'Ad updated successfully',
      ad,
    });
  } catch (error) {
    console.error('Update ad error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update ad',
      error: error.message,
    });
  }
};

/**
 * Delete ad
 * DELETE /api/ads/:id
 */
export const deleteAd = async (req, res) => {
  try {
    const ad = await Ad.findByIdAndUpdate(
      req.params.id,
      { status: 'deleted' },
      { new: true }
    );

    if (!ad) {
      return res.status(404).json({
        success: false,
        message: 'Ad not found',
      });
    }

    res.json({
      success: true,
      message: 'Ad deleted successfully',
    });
  } catch (error) {
    console.error('Delete ad error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete ad',
      error: error.message,
    });
  }
};

/**
 * Duplicate ad
 * POST /api/ads/:id/duplicate
 */
export const duplicateAd = async (req, res) => {
  try {
    const original = await Ad.findById(req.params.id).lean();

    if (!original || original.status === 'deleted') {
      return res.status(404).json({
        success: false,
        message: 'Ad not found',
      });
    }

    const duplicate = await Ad.create({
      ...original,
      _id: undefined,
      name: `${original.name} (Copy)`,
      stats: {
        impressions: 0,
        clicks: 0,
        ctr: 0,
        lastServed: null,
      },
      createdBy: req.user._id,
      createdAt: undefined,
      updatedAt: undefined,
    });

    res.status(201).json({
      success: true,
      message: 'Ad duplicated successfully',
      ad: duplicate,
    });
  } catch (error) {
    console.error('Duplicate ad error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to duplicate ad',
      error: error.message,
    });
  }
};

/**
 * Reorder ads
 * PUT /api/ad-collections/:collectionId/ads/reorder
 */
export const reorderAds = async (req, res) => {
  try {
    const { adIds } = req.body;

    if (!Array.isArray(adIds)) {
      return res.status(400).json({
        success: false,
        message: 'adIds must be an array',
      });
    }

    await Promise.all(
      adIds.map((adId, index) =>
        Ad.findByIdAndUpdate(adId, { order: index })
      )
    );

    res.json({
      success: true,
      message: 'Ads reordered successfully',
    });
  } catch (error) {
    console.error('Reorder ads error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reorder ads',
      error: error.message,
    });
  }
};

/**
 * Get ad analytics
 * GET /api/ads/:id/analytics
 */
export const getAdAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const ad = await Ad.findById(req.params.id).populate('collectionId', 'name placement');

    if (!ad || ad.status === 'deleted') {
      return res.status(404).json({
        success: false,
        message: 'Ad not found',
      });
    }

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const stats = await AdStatsDaily.getStatsForAd(ad._id, start, end);
    let daily = await AdStatsDaily.getDailyBreakdown(ad._id, start, end);

    let analytics = {
      impressions: stats.impressions || 0,
      clicks: stats.clicks || 0,
      ctr: stats.ctr || 0,
      uniqueImpressions: stats.uniqueImpressions || 0,
      uniqueClicks: stats.uniqueClicks || 0,
    };

    if (daily.length === 0) {
      const fallback = await AdEvent.aggregate([
        {
          $match: {
            adId: ad._id,
            createdAt: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: {
              date: {
                $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
              },
              type: '$type',
            },
            count: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: '$_id.date',
            impressions: {
              $sum: {
                $cond: [{ $eq: ['$_id.type', 'impression'] }, '$count', 0],
              },
            },
            clicks: {
              $sum: {
                $cond: [{ $eq: ['$_id.type', 'click'] }, '$count', 0],
              },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      if (fallback.length > 0) {
        daily = fallback.map((row) => {
          const impressions = row.impressions || 0;
          const clicks = row.clicks || 0;
          const ctr = impressions > 0
            ? Number(((clicks / impressions) * 100).toFixed(2))
            : 0;

          return {
            date: new Date(`${row._id}T00:00:00.000Z`),
            impressions,
            clicks,
            ctr,
          };
        });

        const totals = daily.reduce(
          (acc, day) => {
            acc.impressions += day.impressions || 0;
            acc.clicks += day.clicks || 0;
            return acc;
          },
          { impressions: 0, clicks: 0 }
        );
        analytics = {
          impressions: totals.impressions,
          clicks: totals.clicks,
          ctr: totals.impressions > 0
            ? Number(((totals.clicks / totals.impressions) * 100).toFixed(2))
            : 0,
          uniqueImpressions: 0,
          uniqueClicks: 0,
        };
      }
    }

    res.json({
      success: true,
      ad: {
        _id: ad._id,
        name: ad.name,
        collection: ad.collectionId,
      },
      analytics,
      daily,
      dateRange: { start, end },
    });
  } catch (error) {
    console.error('Get ad analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message,
    });
  }
};

/**
 * Track event (PUBLIC)
 * POST /api/ads/track
 */
export const trackEvent = async (req, res) => {
  try {
    const {
      adId,
      eventType,
      type,
      pageType,
      pageUrl,
      device,
      placement,
      articleId,
      categoryId,
      sessionId: providedSessionId,
      eventId,
      country,
    } = req.body;
    const resolvedType = type || eventType;

    if (!adId || !resolvedType) {
      return res.status(400).json({
        success: false,
        message: 'adId and type are required',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(adId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid adId',
      });
    }

    const allowedTypes = ['impression', 'click', 'view', 'conversion'];
    if (!allowedTypes.includes(resolvedType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event type',
      });
    }

    const ad = await Ad.findById(adId);
    if (!ad || ad.status === 'deleted') {
      return res.status(404).json({
        success: false,
        message: 'Ad not found',
      });
    }

    const sessionId = providedSessionId || ensureSessionId(req, res);
    const userId = req.user?._id;
    const normalizedPageType = normalizePageType(pageType);
    const normalizedPageUrl = normalizePagePath(
      pageUrl || req.headers.referer || req.headers.referrer || ''
    );
    const pageKey = buildPageKey({
      pageType: normalizedPageType,
      pageUrl: normalizedPageUrl,
      fallback: articleId || categoryId || normalizedPageType,
    });
    const identityKey = buildIdentityKey({ userId, sessionId });
    const dedupeKey = eventId
      ? buildDedupeKey({
        type: resolvedType,
        adId,
        pageKey,
        identityKey,
        eventId,
      })
      : null;
    const clientIp = getClientIp(req);
    const ipHash = clientIp ? hashIp(clientIp) : '';
    const resolvedCountry = country || req.headers['cf-ipcountry'] || '';
    const referrer = req.headers.referer || req.headers.referrer || '';

    // Create event
    const loggedEvent = await AdEvent.logEvent({
      adId,
      collectionId: ad.collectionId,
      type: resolvedType,
      sessionId,
      userId,
      pageType: normalizedPageType,
      pageUrl: normalizedPageUrl,
      pageKey,
      device: device || 'desktop',
      articleId,
      categoryId,
      placement: placement || '',
      country: resolvedCountry,
      referrer,
      ip: clientIp,
      ipHash,
      dedupeKey,
    });

    // Update ad stats
    if (loggedEvent) {
      if (resolvedType === 'impression') {
        await ad.incrementImpression();
      } else if (resolvedType === 'click') {
        await ad.incrementClick();
      }
    }

    res.json({
      success: true,
      message: 'Event tracked successfully',
      recorded: !!loggedEvent,
    });
  } catch (error) {
    console.error('Track event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track event',
      error: error.message,
    });
  }
};

// ==================== BULK OPERATIONS (NEW!) ====================

/**
 * Bulk update collections
 * POST /api/ad-collections/bulk-update
 */
export const bulkUpdateCollections = async (req, res) => {
  try {
    const { ids, updates } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ids must be a non-empty array',
      });
    }

    const result = await AdCollection.updateMany(
      { _id: { $in: ids } },
      { ...updates, updatedBy: req.user._id }
    );

    res.json({
      success: true,
      message: `Updated ${result.modifiedCount} collections`,
      count: result.modifiedCount,
    });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update collections',
      error: error.message,
    });
  }
};

/**
 * Bulk delete collections
 * POST /api/ad-collections/bulk-delete
 */
export const bulkDeleteCollections = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ids must be a non-empty array',
      });
    }

    // Delete collections
    await AdCollection.deleteMany({ _id: { $in: ids } });

    // Mark ads as deleted
    await Ad.updateMany(
      { collectionId: { $in: ids } },
      { status: 'deleted' }
    );

    res.json({
      success: true,
      message: `Deleted ${ids.length} collections`,
      count: ids.length,
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete collections',
      error: error.message,
    });
  }
};

/**
 * Bulk update ads
 * POST /api/ads/bulk-update
 */
export const bulkUpdateAds = async (req, res) => {
  try {
    const { ids, updates } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ids must be a non-empty array',
      });
    }

    const result = await Ad.updateMany(
      { _id: { $in: ids } },
      { ...updates, updatedBy: req.user._id }
    );

    res.json({
      success: true,
      message: `Updated ${result.modifiedCount} ads`,
      count: result.modifiedCount,
    });
  } catch (error) {
    console.error('Bulk update ads error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update ads',
      error: error.message,
    });
  }
};

/**
 * Bulk delete ads
 * POST /api/ads/bulk-delete
 */
export const bulkDeleteAds = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ids must be a non-empty array',
      });
    }

    await Ad.updateMany(
      { _id: { $in: ids } },
      { status: 'deleted' }
    );

    res.json({
      success: true,
      message: `Deleted ${ids.length} ads`,
      count: ids.length,
    });
  } catch (error) {
    console.error('Bulk delete ads error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete ads',
      error: error.message,
    });
  }
};

export default {
  // Collections
  getAllCollections,
  getCollection,
  createCollection,
  updateCollection,
  deleteCollection,
  duplicateCollection,
  updateCollectionStats,
  getCollectionAnalytics,
  selectCollection,
  
  // Ads
  getAds,
  getAd,
  createAd,
  updateAd,
  deleteAd,
  duplicateAd,
  reorderAds,
  getAdAnalytics,
  trackEvent,
  
  // Bulk operations
  bulkUpdateCollections,
  bulkDeleteCollections,
  bulkUpdateAds,
  bulkDeleteAds,
};
