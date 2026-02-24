import mongoose from 'mongoose';

// Page view tracking
const pageViewSchema = new mongoose.Schema(
  {
    article: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Article',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    uniqueVisitors: {
      type: Number,
      default: 0,
    },
    // Track visitor fingerprints for unique count (hashed)
    visitorHashes: {
      type: [String],
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

pageViewSchema.index({ article: 1, date: 1 }, { unique: true });
pageViewSchema.index({ date: -1 });

// Site-wide analytics
const siteAnalyticsSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      unique: true,
    },
    totalPageViews: {
      type: Number,
      default: 0,
    },
    uniqueVisitors: {
      type: Number,
      default: 0,
    },
    newUsers: {
      type: Number,
      default: 0,
    },
    articlesPublished: {
      type: Number,
      default: 0,
    },
    // Traffic sources
    trafficSources: {
      direct: { type: Number, default: 0 },
      organic: { type: Number, default: 0 },
      social: { type: Number, default: 0 },
      referral: { type: Number, default: 0 },
    },
    // Device breakdown
    devices: {
      desktop: { type: Number, default: 0 },
      mobile: { type: Number, default: 0 },
      tablet: { type: Number, default: 0 },
    },
    // Top categories
    topCategories: [
      {
        category: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Category',
        },
        views: Number,
      },
    ],
    // Top articles
    topArticles: [
      {
        article: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Article',
        },
        views: Number,
      },
    ],
  },
  {
    timestamps: true,
  }
);

siteAnalyticsSchema.index({ date: -1 });

// AI usage logging
const aiLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      enum: [
        'grammar-check',
        'headline-generator',
        'summary',
        'sentiment-analysis',
        'writing-improvement',
        'translation',
        'translation-azure',
      ],
      required: true,
    },
    inputTokens: {
      type: Number,
      default: 0,
    },
    outputTokens: {
      type: Number,
      default: 0,
    },
    totalTokens: {
      type: Number,
      default: 0,
    },
    model: {
      type: String,
      default: 'gpt-3.5-turbo',
    },
    success: {
      type: Boolean,
      default: true,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    responseTime: {
      type: Number, // in milliseconds
      default: 0,
    },
    article: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Article',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

aiLogSchema.index({ user: 1, createdAt: -1 });
aiLogSchema.index({ action: 1 });
aiLogSchema.index({ createdAt: -1 });

// Contact messages
const contactMessageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      maxlength: [200, 'Subject cannot exceed 200 characters'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: [5000, 'Message cannot exceed 5000 characters'],
    },
    status: {
      type: String,
      enum: ['new', 'read', 'replied', 'archived'],
      default: 'new',
    },
    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    repliedAt: {
      type: Date,
      default: null,
    },
    replyMessage: {
      type: String,
      default: '',
    },
    ipAddress: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

contactMessageSchema.index({ status: 1, createdAt: -1 });
contactMessageSchema.index({ email: 1 });

// Export models
export const PageView = mongoose.model('PageView', pageViewSchema);
export const SiteAnalytics = mongoose.model('SiteAnalytics', siteAnalyticsSchema);
export const AILog = mongoose.model('AILog', aiLogSchema);
export const ContactMessage = mongoose.model('ContactMessage', contactMessageSchema);

// Helper functions for analytics
export const analyticsHelpers = {
  // Get or create today's page view record
  async getOrCreatePageView(articleId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let pageView = await PageView.findOne({
      article: articleId,
      date: today,
    });

    if (!pageView) {
      pageView = new PageView({
        article: articleId,
        date: today,
      });
    }

    return pageView;
  },

  // Get or create today's site analytics
  async getOrCreateSiteAnalytics() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let analytics = await SiteAnalytics.findOne({ date: today });

    if (!analytics) {
      analytics = new SiteAnalytics({ date: today });
    }

    return analytics;
  },

  // Record a page view
  async recordPageView(articleId, visitorHash) {
    const pageView = await this.getOrCreatePageView(articleId);
    pageView.views += 1;

    // Check if unique visitor
    if (!pageView.visitorHashes.includes(visitorHash)) {
      pageView.visitorHashes.push(visitorHash);
      pageView.uniqueVisitors += 1;
    }

    await pageView.save();

    // Update site analytics
    const siteAnalytics = await this.getOrCreateSiteAnalytics();
    siteAnalytics.totalPageViews += 1;
    await siteAnalytics.save();

    return pageView;
  },

  // Get analytics summary
  async getSummary(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const analytics = await SiteAnalytics.find({
      date: { $gte: startDate },
    }).sort({ date: 1 });

    const totals = analytics.reduce(
      (acc, day) => ({
        totalPageViews: acc.totalPageViews + day.totalPageViews,
        uniqueVisitors: acc.uniqueVisitors + day.uniqueVisitors,
        newUsers: acc.newUsers + day.newUsers,
        articlesPublished: acc.articlesPublished + day.articlesPublished,
      }),
      { totalPageViews: 0, uniqueVisitors: 0, newUsers: 0, articlesPublished: 0 }
    );

    return {
      period: `Last ${days} days`,
      ...totals,
      dailyData: analytics,
    };
  },
};
