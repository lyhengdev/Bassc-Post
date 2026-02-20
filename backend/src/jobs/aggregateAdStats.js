import mongoose from 'mongoose';
import AdEvent from '../models/AdEvent.js';
import AdStatsDaily from '../models/AdStatsDaily.js';
import Ad from '../models/Ad.js';

/**
 * Aggregate AdEvents into AdStatsDaily for a specific date
 * Should be run daily via cron job
 * 
 * @param {Date} date - Date to aggregate (defaults to yesterday)
 */
export const aggregateAdStats = async (date = null) => {
  // Default to yesterday
  const targetDate = date || new Date(Date.now() - 24 * 60 * 60 * 1000);
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  console.log(`[AdStats] Aggregating stats for ${startOfDay.toISOString().split('T')[0]}`);

  try {
    // Get all ads that had events on this day
    const adsWithEvents = await AdEvent.distinct('adId', {
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    console.log(`[AdStats] Found ${adsWithEvents.length} ads with events`);

    for (const adId of adsWithEvents) {
      const stats = await AdEvent.aggregate([
        {
          $match: {
            adId: new mongoose.Types.ObjectId(adId),
            createdAt: { $gte: startOfDay, $lte: endOfDay }
          }
        },
        {
          $facet: {
            // Overall counts
            totals: [
              {
                $group: {
                  _id: '$type',
                  count: { $sum: 1 },
                  uniqueSessions: { $addToSet: '$sessionId' }
                }
              }
            ],
            // By device
            byDevice: [
              {
                $group: {
                  _id: { device: '$device', type: '$type' },
                  count: { $sum: 1 }
                }
              }
            ],
            // By page type
            byPageType: [
              {
                $group: {
                  _id: { pageType: '$pageType', type: '$type' },
                  count: { $sum: 1 }
                }
              }
            ],
            // Top pages
            topPages: [
              {
                $match: { pageUrl: { $ne: '' } }
              },
              {
                $group: {
                  _id: { pageUrl: '$pageUrl', type: '$type' },
                  count: { $sum: 1 }
                }
              },
              {
                $group: {
                  _id: '$_id.pageUrl',
                  impressions: {
                    $sum: { $cond: [{ $eq: ['$_id.type', 'impression'] }, '$count', 0] }
                  },
                  clicks: {
                    $sum: { $cond: [{ $eq: ['$_id.type', 'click'] }, '$count', 0] }
                  }
                }
              },
              { $sort: { impressions: -1 } },
              { $limit: 5 }
            ]
          }
        }
      ]);

      const result = stats[0];
      
      // Process totals
      let impressions = 0;
      let clicks = 0;
      let uniqueImpressions = 0;
      let uniqueClicks = 0;

      result.totals.forEach(t => {
        if (t._id === 'impression') {
          impressions = t.count;
          uniqueImpressions = t.uniqueSessions?.length || 0;
        }
        if (t._id === 'click') {
          clicks = t.count;
          uniqueClicks = t.uniqueSessions?.length || 0;
        }
      });

      // Process by device
      const byDevice = {
        desktop: { impressions: 0, clicks: 0 },
        mobile: { impressions: 0, clicks: 0 },
        tablet: { impressions: 0, clicks: 0 }
      };
      
      result.byDevice.forEach(d => {
        const device = d._id.device || 'desktop';
        const type = d._id.type;
        if (byDevice[device]) {
          if (type === 'impression') byDevice[device].impressions = d.count;
          if (type === 'click') byDevice[device].clicks = d.count;
        }
      });

      // Process by page type
      const byPageType = {
        homepage: { impressions: 0, clicks: 0 },
        article: { impressions: 0, clicks: 0 },
        category: { impressions: 0, clicks: 0 },
        search: { impressions: 0, clicks: 0 },
        other: { impressions: 0, clicks: 0 }
      };
      
      result.byPageType.forEach(p => {
        const pageType = p._id.pageType || 'other';
        const type = p._id.type;
        if (byPageType[pageType]) {
          if (type === 'impression') byPageType[pageType].impressions = p.count;
          if (type === 'click') byPageType[pageType].clicks = p.count;
        }
      });

      // Process top pages
      const topPages = result.topPages.map(p => ({
        url: p._id,
        impressions: p.impressions,
        clicks: p.clicks
      }));

      // Calculate CTR
      const ctr = impressions > 0 ? parseFloat(((clicks / impressions) * 100).toFixed(2)) : 0;

      // Upsert daily stats
      await AdStatsDaily.findOneAndUpdate(
        { adId, date: startOfDay },
        {
          adId,
          date: startOfDay,
          impressions,
          clicks,
          uniqueImpressions,
          uniqueClicks,
          ctr,
          byDevice,
          byPageType,
          topPages
        },
        { upsert: true, new: true }
      );

      // Update Ad.stats for quick access
      await Ad.findByIdAndUpdate(adId, {
        $inc: {
          'stats.impressions': impressions,
          'stats.clicks': clicks
        },
        $set: {
          'stats.ctr': ctr,
          'stats.lastImpression': impressions > 0 ? endOfDay : undefined,
          'stats.lastClick': clicks > 0 ? endOfDay : undefined
        }
      });
    }

    console.log(`[AdStats] Aggregation complete for ${adsWithEvents.length} ads`);
    return { success: true, adsProcessed: adsWithEvents.length };

  } catch (error) {
    console.error('[AdStats] Aggregation failed:', error);
    throw error;
  }
};

/**
 * Backfill stats for a date range
 * Useful for initial setup or recovery
 */
export const backfillStats = async (startDate, endDate) => {
  const current = new Date(startDate);
  const end = new Date(endDate);
  const results = [];

  while (current <= end) {
    try {
      const result = await aggregateAdStats(new Date(current));
      results.push({ date: current.toISOString().split('T')[0], ...result });
    } catch (error) {
      results.push({ date: current.toISOString().split('T')[0], success: false, error: error.message });
    }
    current.setDate(current.getDate() + 1);
  }

  return results;
};

export default {
  aggregateAdStats,
  backfillStats
};
