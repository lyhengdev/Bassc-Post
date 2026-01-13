import mongoose from 'mongoose';

/**
 * AdStatsDaily Model - Daily aggregated ad statistics
 * Populated by scheduled job that aggregates AdEvents
 * Used for dashboards and reporting (fast reads)
 */
const adStatsDailySchema = new mongoose.Schema({
  adId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Ad', 
    required: true,
    index: true
  },
  date: { 
    type: Date, 
    required: true,
    index: true
  },
  
  // Core Metrics
  impressions: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  uniqueImpressions: { type: Number, default: 0 },
  uniqueClicks: { type: Number, default: 0 },
  ctr: { type: Number, default: 0 }, // Click-through rate %
  
  // Breakdown by Device
  byDevice: {
    desktop: { impressions: { type: Number, default: 0 }, clicks: { type: Number, default: 0 } },
    mobile: { impressions: { type: Number, default: 0 }, clicks: { type: Number, default: 0 } },
    tablet: { impressions: { type: Number, default: 0 }, clicks: { type: Number, default: 0 } }
  },
  
  // Breakdown by Page Type
  byPageType: {
    homepage: { impressions: { type: Number, default: 0 }, clicks: { type: Number, default: 0 } },
    article: { impressions: { type: Number, default: 0 }, clicks: { type: Number, default: 0 } },
    category: { impressions: { type: Number, default: 0 }, clicks: { type: Number, default: 0 } },
    search: { impressions: { type: Number, default: 0 }, clicks: { type: Number, default: 0 } },
    other: { impressions: { type: Number, default: 0 }, clicks: { type: Number, default: 0 } }
  },
  
  // Top performing pages (top 5)
  topPages: [{
    url: String,
    impressions: Number,
    clicks: Number
  }],
  
}, {
  timestamps: true
});

// Compound unique index
adStatsDailySchema.index({ adId: 1, date: 1 }, { unique: true });
adStatsDailySchema.index({ date: -1 });

// Static: Get stats for date range
adStatsDailySchema.statics.getStatsForAd = async function(adId, startDate, endDate) {
  const match = { adId: new mongoose.Types.ObjectId(adId) };
  
  if (startDate || endDate) {
    match.date = {};
    if (startDate) match.date.$gte = startDate;
    if (endDate) match.date.$lte = endDate;
  }
  
  const result = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalImpressions: { $sum: '$impressions' },
        totalClicks: { $sum: '$clicks' },
        totalUniqueImpressions: { $sum: '$uniqueImpressions' },
        totalUniqueClicks: { $sum: '$uniqueClicks' },
        days: { $sum: 1 }
      }
    }
  ]);
  
  if (result.length === 0) {
    return { impressions: 0, clicks: 0, ctr: 0, days: 0 };
  }
  
  const stats = result[0];
  stats.ctr = stats.totalImpressions > 0 
    ? (stats.totalClicks / stats.totalImpressions * 100).toFixed(2) 
    : 0;
  
  return {
    impressions: stats.totalImpressions,
    clicks: stats.totalClicks,
    uniqueImpressions: stats.totalUniqueImpressions,
    uniqueClicks: stats.totalUniqueClicks,
    ctr: parseFloat(stats.ctr),
    days: stats.days
  };
};

// Static: Get daily breakdown
adStatsDailySchema.statics.getDailyBreakdown = async function(adId, startDate, endDate) {
  const match = { adId: new mongoose.Types.ObjectId(adId) };
  
  if (startDate || endDate) {
    match.date = {};
    if (startDate) match.date.$gte = startDate;
    if (endDate) match.date.$lte = endDate;
  }
  
  return this.find(match)
    .sort({ date: 1 })
    .select('date impressions clicks ctr byDevice byPageType')
    .lean();
};

// Static: Get aggregated stats for all ads
adStatsDailySchema.statics.getAllAdsStats = async function(startDate, endDate) {
  const match = {};
  
  if (startDate || endDate) {
    match.date = {};
    if (startDate) match.date.$gte = startDate;
    if (endDate) match.date.$lte = endDate;
  }
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$adId',
        totalImpressions: { $sum: '$impressions' },
        totalClicks: { $sum: '$clicks' },
        days: { $sum: 1 }
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
        impressions: '$totalImpressions',
        clicks: '$totalClicks',
        ctr: {
          $cond: [
            { $gt: ['$totalImpressions', 0] },
            { $multiply: [{ $divide: ['$totalClicks', '$totalImpressions'] }, 100] },
            0
          ]
        },
        days: 1
      }
    },
    { $sort: { impressions: -1 } }
  ]);
};

const AdStatsDaily = mongoose.model('AdStatsDaily', adStatsDailySchema);

export default AdStatsDaily;
