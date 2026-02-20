import mongoose from 'mongoose';

/**
 * AdEvent Model - Tracks impressions and clicks
 * Now includes collectionId for collection-level analytics
 */
const adEventSchema = new mongoose.Schema({
  // REFERENCES
  collectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdCollection',
    required: true,
    index: true,
  },
  adId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ad',
    required: true,
    index: true,
  },

  // EVENT TYPE
  type: {
    type: String,
    enum: ['impression', 'click', 'view', 'conversion'],
    required: true,
    index: true,
  },

  // CONTEXT
  pageType: {
    type: String,
    enum: ['homepage', 'article', 'category', 'search', 'page', 'other'],
    default: 'other',
  },
  pageUrl: {
    type: String,
    default: '',
  },
  pageKey: {
    type: String,
    default: '',
    index: true,
  },
  articleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Article',
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
  },

  // USER INFO (anonymized)
  sessionId: {
    type: String,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  // DEVICE INFO
  device: {
    type: String,
    enum: ['desktop', 'mobile', 'tablet'],
    default: 'desktop',
  },
  browser: {
    type: String,
    default: '',
  },
  os: {
    type: String,
    default: '',
  },

  // LOCATION (optional)
  country: {
    type: String,
    default: '',
  },
  region: {
    type: String,
    default: '',
  },

  // IP TRACKING (for fraud detection, hashed for privacy)
  ip: {
    type: String,
    default: '',
    select: false, // Don't include in normal queries
  },
  ipHash: {
    type: String,
    default: '',
    index: true,
  },

  // METADATA
  referrer: {
    type: String,
    default: '',
  },
  placement: {
    type: String,
    default: '',
  },
  dedupeKey: {
    type: String,
  },
}, {
  timestamps: true,
});

// INDEXES
adEventSchema.index({ collectionId: 1, type: 1, createdAt: -1 });
adEventSchema.index({ adId: 1, type: 1, createdAt: -1 });
adEventSchema.index({ sessionId: 1, adId: 1, pageKey: 1 });
adEventSchema.index({ userId: 1, adId: 1, pageKey: 1 });
adEventSchema.index({ ipHash: 1, type: 1, createdAt: -1 });
adEventSchema.index({ dedupeKey: 1 }, { unique: true, sparse: true });
adEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }); // TTL 90 days

// STATICS
adEventSchema.statics.logEvent = async function(data) {
  try {
    return await this.create(data);
  } catch (err) {
    if (err?.code !== 11000) {
      console.error('Failed to log ad event:', err.message);
    }
    return null;
  }
};

adEventSchema.statics.hasSeenCollection = async function(identity = {}, collectionId, frequency = 'once_per_session', pageKey = '') {
  if (frequency === 'unlimited') return false;

  const { sessionId, userId } = identity;
  const identifier = userId || sessionId;
  if (!identifier) return false;

  const query = { collectionId, type: 'impression' };

  if (frequency === 'once_per_user' && userId) {
    query.userId = userId;
  } else if (frequency === 'once_per_session' && sessionId) {
    query.sessionId = sessionId;
  } else if (frequency === 'once_per_session' && userId) {
    query.userId = userId;
  } else if (userId) {
    query.userId = userId;
  } else if (sessionId) {
    query.sessionId = sessionId;
  }

  if (frequency === 'once_per_day') {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    query.createdAt = { $gte: startOfDay };
  }
  if (frequency === 'once_per_page' && pageKey) {
    query.pageKey = pageKey;
  }

  const count = await this.countDocuments(query);
  return count > 0;
};

adEventSchema.statics.getCollectionStats = async function(collectionId, startDate, endDate) {
  const match = { collectionId: new mongoose.Types.ObjectId(collectionId) };

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
        count: { $sum: 1 },
      },
    },
  ]);

  const stats = { impressions: 0, clicks: 0 };
  result.forEach(r => {
    if (r._id === 'impression') stats.impressions = r.count;
    if (r._id === 'click') stats.clicks = r.count;
  });
  stats.ctr = stats.impressions > 0 ? ((stats.clicks / stats.impressions) * 100).toFixed(2) : 0;

  return stats;
};

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
        count: { $sum: 1 },
      },
    },
  ]);

  const stats = { impressions: 0, clicks: 0 };
  result.forEach(r => {
    if (r._id === 'impression') stats.impressions = r.count;
    if (r._id === 'click') stats.clicks = r.count;
  });
  stats.ctr = stats.impressions > 0 ? ((stats.clicks / stats.impressions) * 100).toFixed(2) : 0;

  return stats;
};

const AdEvent = mongoose.model('AdEvent', adEventSchema);

export default AdEvent;
