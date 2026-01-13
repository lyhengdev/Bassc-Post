import mongoose from 'mongoose';

/**
 * AdEvent Model - Tracks ad impressions and clicks
 * Separates analytics from the Ad document to prevent hot writes
 * 
 * Events are aggregated daily into AdStatsDaily for dashboards
 */
const adEventSchema = new mongoose.Schema({
  adId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Ad', 
    required: true,
    index: true
  },
  type: { 
    type: String, 
    enum: ['impression', 'click', 'view', 'conversion'], 
    required: true,
    index: true
  },
  
  // Context
  pageType: { 
    type: String, 
    enum: ['homepage', 'article', 'category', 'search', 'page', 'other'],
    default: 'other'
  },
  pageUrl: { type: String, default: '' },
  articleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Article' },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  
  // User Info (anonymized)
  sessionId: { type: String, index: true }, // For frequency control
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // If logged in
  
  // Device Info
  device: { 
    type: String, 
    enum: ['desktop', 'mobile', 'tablet'], 
    default: 'desktop' 
  },
  browser: { type: String, default: '' },
  os: { type: String, default: '' },
  
  // Location (optional)
  country: { type: String, default: '' },
  region: { type: String, default: '' },
  
  // Metadata
  referrer: { type: String, default: '' },
  placement: { type: String, default: '' },
  
}, {
  timestamps: true,
  // Use capped collection for auto-cleanup (optional)
  // capped: { size: 100000000, max: 1000000 } // 100MB or 1M docs
});

// Indexes for efficient queries and aggregation
adEventSchema.index({ createdAt: -1 });
adEventSchema.index({ adId: 1, type: 1, createdAt: -1 });
adEventSchema.index({ adId: 1, createdAt: 1 }); // For daily aggregation
adEventSchema.index({ sessionId: 1, adId: 1, type: 1 }); // Frequency check

// TTL index - auto-delete events older than 90 days
adEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Static: Log an event
adEventSchema.statics.logEvent = async function(data) {
  try {
    return await this.create(data);
  } catch (err) {
    console.error('Failed to log ad event:', err.message);
    return null;
  }
};

// Static: Check if user has seen ad (for frequency control)
adEventSchema.statics.hasSeenAd = async function(sessionId, adId, frequency = 'once_per_session') {
  if (!sessionId || frequency === 'unlimited') return false;
  
  const query = { sessionId, adId };
  
  if (frequency === 'once_per_day') {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    query.createdAt = { $gte: startOfDay };
  }
  
  const count = await this.countDocuments(query);
  return count > 0;
};

// Static: Get impressions/clicks for an ad in date range
adEventSchema.statics.getAdStats = async function(adId, startDate, endDate) {
  const match = { adId: new mongoose.Types.ObjectId(adId) };
  
  if (startDate) match.createdAt = { $gte: startDate };
  if (endDate) {
    match.createdAt = match.createdAt || {};
    match.createdAt.$lte = endDate;
  }
  
  const result = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const stats = { impressions: 0, clicks: 0 };
  result.forEach(r => {
    if (r._id === 'impression') stats.impressions = r.count;
    if (r._id === 'click') stats.clicks = r.count;
  });
  stats.ctr = stats.impressions > 0 ? (stats.clicks / stats.impressions * 100).toFixed(2) : 0;
  
  return stats;
};

const AdEvent = mongoose.model('AdEvent', adEventSchema);

export default AdEvent;
