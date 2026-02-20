import mongoose from 'mongoose';

/**
 * Analytics Event Model
 * 
 * Tracks all user interactions and events
 * for advanced analytics and insights
 */

const analyticsEventSchema = new mongoose.Schema({
  // Event identification
  eventType: {
    type: String,
    required: true,
    enum: [
      // Page events
      'page_view',
      'page_exit',
      
      // Content events
      'article_view',
      'article_read',
      'article_share',
      'article_bookmark',
      'article_comment',
      
      // Engagement events
      'scroll_depth',
      'reading_time',
      'click',
      'search',
      'search_result_click',
      
      // User events
      'user_signup',
      'user_login',
      'user_logout',
      'newsletter_subscribe',
      
      // Conversion events
      'conversion',
      'goal_completed',
      
      // Campaign events
      'campaign_view',
      'campaign_click',
      'campaign_conversion',
      
      // Custom events
      'custom',
    ],
    index: true,
  },

  // Event properties
  properties: {
    // Page info
    page: {
      url: String,
      path: String,
      title: String,
      referrer: String,
      language: String,
    },

    // Article info (if applicable)
    article: {
      _id: mongoose.Schema.Types.ObjectId,
      slug: String,
      title: String,
      category: String,
      author: String,
      tags: [String],
    },

    // User engagement
    engagement: {
      scrollDepth: Number,        // Percentage scrolled (0-100)
      readingTime: Number,        // Seconds spent reading
      timeOnPage: Number,         // Total time on page
      clicks: Number,             // Number of clicks
      interactions: Number,       // Total interactions
    },

    // Search info
    search: {
      query: String,
      resultsCount: Number,
      resultClicked: String,
      position: Number,
    },

    // Campaign info
    campaign: {
      _id: mongoose.Schema.Types.ObjectId,
      name: String,
      placement: String,
      adId: String,
    },

    // Custom properties
    custom: mongoose.Schema.Types.Mixed,
  },

  // User identification
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },

  sessionId: {
    type: String,
    required: true,
    index: true,
  },

  // Device & browser info
  device: {
    type: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'unknown'],
      default: 'unknown',
    },
    browser: String,
    browserVersion: String,
    os: String,
    osVersion: String,
    screenWidth: Number,
    screenHeight: Number,
    viewport: {
      width: Number,
      height: Number,
    },
  },

  // Location info
  location: {
    country: String,
    countryCode: String,
    region: String,
    city: String,
    timezone: String,
    ip: String,              // Anonymized
    coordinates: {
      latitude: Number,
      longitude: Number,
    },
  },

  // Traffic source
  source: {
    type: {
      type: String,
      enum: ['direct', 'organic', 'social', 'referral', 'email', 'paid', 'unknown'],
      default: 'unknown',
    },
    medium: String,           // cpc, organic, referral, etc.
    campaign: String,         // UTM campaign
    source: String,           // UTM source
    term: String,             // UTM term
    content: String,          // UTM content
    referrer: String,
  },

  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now,
    // index: true, // Removed - covered by compound indexes below
  },


  // Performance metrics
  performance: {
    pageLoadTime: Number,     // Milliseconds
    domInteractive: Number,
    domComplete: Number,
    firstContentfulPaint: Number,
    largestContentfulPaint: Number,
  },

  // A/B testing
  experiments: [{
    experimentId: String,
    variant: String,
  }],

  // Metadata
  metadata: {
    userAgent: String,
    language: String,
    isBot: Boolean,
    isNewUser: Boolean,
    isReturningUser: Boolean,
    sessionNumber: Number,
  },
}, {
  timestamps: true,
});

// INDEXES for fast queries
analyticsEventSchema.index({ eventType: 1, timestamp: -1 });
analyticsEventSchema.index({ userId: 1, timestamp: -1 });
analyticsEventSchema.index({ sessionId: 1, timestamp: -1 });
analyticsEventSchema.index({ 'article._id': 1, timestamp: -1 });
analyticsEventSchema.index({ 'source.type': 1, timestamp: -1 });
analyticsEventSchema.index({ timestamp: -1 }); // For time-series queries

// Compound indexes for complex queries
analyticsEventSchema.index({ eventType: 1, timestamp: -1, userId: 1 });
analyticsEventSchema.index({ 'article._id': 1, eventType: 1, timestamp: -1 });

// TTL index (optional - auto-delete old events after 90 days)
analyticsEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// METHODS

// Get events by date range
analyticsEventSchema.statics.getByDateRange = function(startDate, endDate, filters = {}) {
  const query = {
    timestamp: {
      $gte: startDate,
      $lte: endDate,
    },
    ...filters,
  };

  return this.find(query).sort({ timestamp: -1 });
};

// Get events count by type
analyticsEventSchema.statics.getEventCounts = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: '$eventType',
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);
};

// Get unique users count
analyticsEventSchema.statics.getUniqueUsers = async function(startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate },
        userId: { $exists: true, $ne: null },
      },
    },
    {
      $group: {
        _id: '$userId',
      },
    },
    {
      $count: 'uniqueUsers',
    },
  ]);

  return result[0]?.uniqueUsers || 0;
};

// Get unique sessions count
analyticsEventSchema.statics.getUniqueSessions = async function(startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: '$sessionId',
      },
    },
    {
      $count: 'uniqueSessions',
    },
  ]);

  return result[0]?.uniqueSessions || 0;
};

// Get top articles
analyticsEventSchema.statics.getTopArticles = async function(startDate, endDate, limit = 10) {
  return this.aggregate([
    {
      $match: {
        eventType: 'article_view',
        timestamp: { $gte: startDate, $lte: endDate },
        'article._id': { $exists: true },
      },
    },
    {
      $group: {
        _id: '$article._id',
        views: { $sum: 1 },
        article: { $first: '$article' },
      },
    },
    {
      $sort: { views: -1 },
    },
    {
      $limit: limit,
    },
  ]);
};

// Get traffic sources
analyticsEventSchema.statics.getTrafficSources = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        eventType: 'page_view',
        timestamp: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: '$source.type',
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);
};

// Get device breakdown
analyticsEventSchema.statics.getDeviceBreakdown = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: '$device.type',
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);
};

// Get hourly distribution
analyticsEventSchema.statics.getHourlyDistribution = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $project: {
        hour: { $hour: '$timestamp' },
      },
    },
    {
      $group: {
        _id: '$hour',
        count: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);
};

const AnalyticsEvent = mongoose.model('AnalyticsEvent', analyticsEventSchema);

export default AnalyticsEvent;
