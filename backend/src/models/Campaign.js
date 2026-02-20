import mongoose from 'mongoose';

/**
 * Campaign Model - Simplified Ads System
 * 
 * One campaign = One placement with multiple ad variations for A/B testing
 * Replaces the complex AdCollection + Ad two-level system
 */

// Ad Variation Schema (embedded in campaign)
const adVariationSchema = new mongoose.Schema({
  // Ad ID (for tracking)
  adId: {
    type: String,
    required: true,
    unique: true,
  },

  // Ad type
  type: {
    type: String,
    enum: ['image', 'html', 'video'],
    default: 'image',
  },

  // Image ad
  imageUrl: {
    type: String,
    default: '',
  },
  mobileImageUrl: {
    type: String,
    default: '',
  },

  // HTML ad
  htmlContent: {
    type: String,
    default: '',
  },

  // Video ad
  videoUrl: {
    type: String,
    default: '',
  },

  // Link
  linkUrl: {
    type: String,
    default: '',
  },
  linkTarget: {
    type: String,
    enum: ['_blank', '_self'],
    default: '_blank',
  },
  ctaText: {
    type: String,
    default: 'Learn More',
    maxLength: 50,
  },

  // Alt text for accessibility
  altText: {
    type: String,
    default: '',
  },

  // A/B Testing Weight (0-100)
  weight: {
    type: Number,
    default: 50,
    min: 0,
    max: 100,
  },

  // Performance Stats
  stats: {
    impressions: {
      type: Number,
      default: 0,
    },
    clicks: {
      type: Number,
      default: 0,
    },
    ctr: {
      type: Number,
      default: 0,
    },
    conversions: {
      type: Number,
      default: 0,
    },
  },

  // Status
  isActive: {
    type: Boolean,
    default: true,
  },
}, { _id: false });

// Main Campaign Schema
const campaignSchema = new mongoose.Schema({
  // BASIC INFO
  name: {
    type: String,
    required: true,
    trim: true,
    maxLength: 200,
    index: true,
  },

  description: {
    type: String,
    default: '',
    maxLength: 500,
  },

  // PLACEMENT (Simplified - only 6 options!)
  placement: {
    type: String,
    required: true,
    enum: [
      'popup',         // Center overlay modal
      'top_banner',    // Top of page banner
      'in_content',    // Native ads within content
      'sidebar',       // Right/left sidebar
      'floating',      // Bottom-right floating
      'footer_banner', // Bottom of page banner
    ],
    index: true,
  },

  // SIMPLIFIED TARGETING
  targeting: {
    // Pages (simple checkbox)
    pages: [{
      type: String,
      enum: ['homepage', 'article', 'category', 'search', 'page'],
    }],

    // Devices (simple checkbox)
    devices: [{
      type: String,
      enum: ['desktop', 'mobile', 'tablet'],
      default: ['desktop', 'mobile', 'tablet'],
    }],

    // Visitor type (radio button)
    visitors: {
      type: String,
      enum: ['all', 'new', 'returning'],
      default: 'all',
    },

    // Optional: Countries
    countries: [{
      type: String,
      default: [],
    }],

    // Optional: Categories
    categories: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    }],
  },

  // SCHEDULE
  schedule: {
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: null, // null = no end date
    },
    timezone: {
      type: String,
      default: 'Asia/Phnom_Penh',
    },
  },

  // AD VARIATIONS (Embedded!)
  ads: [adVariationSchema],

  // PLACEMENT-SPECIFIC SETTINGS
  settings: {
    // Popup settings
    popup: {
      autoClose: {
        type: Boolean,
        default: true,
      },
      autoCloseSeconds: {
        type: Number,
        default: 10,
        min: 3,
        max: 60,
      },
      showCloseButton: {
        type: Boolean,
        default: true,
      },
      backdropClickClose: {
        type: Boolean,
        default: true,
      },
    },

    // Banner settings
    banner: {
      sticky: {
        type: Boolean,
        default: false,
      },
      dismissible: {
        type: Boolean,
        default: true,
      },
    },

    // Floating settings
    floating: {
      position: {
        type: String,
        enum: ['bottom-right', 'bottom-left', 'top-right', 'top-left'],
        default: 'bottom-right',
      },
      minimizable: {
        type: Boolean,
        default: true,
      },
    },

    // In-content settings
    inContent: {
      position: {
        type: String,
        enum: ['after_paragraph', 'after_section', 'middle'],
        default: 'after_paragraph',
      },
      paragraphIndex: {
        type: Number,
        default: 3, // After 3rd paragraph
      },
    },
  },

  // FREQUENCY CONTROL
  frequency: {
    type: {
      type: String,
      enum: ['unlimited', 'once_per_session', 'once_per_day'],
      default: 'once_per_session',
    },
    maxImpressions: {
      type: Number,
      default: 0, // 0 = unlimited
    },
    maxClicks: {
      type: Number,
      default: 0, // 0 = unlimited
    },
  },

  // CAMPAIGN STATUS
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'ended'],
    default: 'draft',
    index: true,
  },

  // CAMPAIGN STATS (Aggregated from all ads)
  stats: {
    totalImpressions: {
      type: Number,
      default: 0,
    },
    totalClicks: {
      type: Number,
      default: 0,
    },
    ctr: {
      type: Number,
      default: 0,
    },
    totalConversions: {
      type: Number,
      default: 0,
    },
    // Budget tracking (optional)
    budget: {
      type: Number,
      default: 0,
    },
    spent: {
      type: Number,
      default: 0,
    },
  },

  // METADATA
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// INDEXES
campaignSchema.index({ status: 1, placement: 1 });
campaignSchema.index({ 'schedule.startDate': 1, 'schedule.endDate': 1 });
campaignSchema.index({ 'targeting.pages': 1 });
campaignSchema.index({ createdBy: 1 });

// VIRTUALS

// Active ads count
campaignSchema.virtual('activeAdsCount').get(function() {
  return this.ads.filter(ad => ad.isActive).length;
});

// Is currently running
campaignSchema.virtual('isRunning').get(function() {
  if (this.status !== 'active') return false;
  
  const now = new Date();
  const started = !this.schedule.startDate || new Date(this.schedule.startDate) <= now;
  const notEnded = !this.schedule.endDate || new Date(this.schedule.endDate) >= now;
  
  return started && notEnded;
});

// METHODS

// Update campaign stats (aggregate from all ads)
campaignSchema.methods.updateStats = function() {
  const totalImpressions = this.ads.reduce((sum, ad) => sum + (ad.stats.impressions || 0), 0);
  const totalClicks = this.ads.reduce((sum, ad) => sum + (ad.stats.clicks || 0), 0);
  const totalConversions = this.ads.reduce((sum, ad) => sum + (ad.stats.conversions || 0), 0);
  
  this.stats.totalImpressions = totalImpressions;
  this.stats.totalClicks = totalClicks;
  this.stats.totalConversions = totalConversions;
  this.stats.ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : 0;
  
  return this.save();
};

// Get winning ad (highest CTR)
campaignSchema.methods.getWinningAd = function() {
  if (this.ads.length === 0) return null;
  
  return this.ads.reduce((winner, ad) => {
    const adCtr = ad.stats.impressions > 0 ? (ad.stats.clicks / ad.stats.impressions) : 0;
    const winnerCtr = winner.stats.impressions > 0 ? (winner.stats.clicks / winner.stats.impressions) : 0;
    return adCtr > winnerCtr ? ad : winner;
  });
};

// Select ad based on weight (for A/B testing)
campaignSchema.methods.selectAd = function() {
  const activeAds = this.ads.filter(ad => ad.isActive);
  if (activeAds.length === 0) return null;
  if (activeAds.length === 1) return activeAds[0];
  
  // Weighted random selection
  const totalWeight = activeAds.reduce((sum, ad) => sum + ad.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const ad of activeAds) {
    random -= ad.weight;
    if (random <= 0) return ad;
  }
  
  return activeAds[0]; // Fallback
};

// STATIC METHODS

// Get active campaigns
campaignSchema.statics.getActive = function(filters = {}) {
  return this.find({
    status: 'active',
    ...filters,
  }).sort({ createdAt: -1 });
};

// Get campaigns by placement
campaignSchema.statics.getByPlacement = function(placement) {
  return this.find({
    placement,
    status: 'active',
  });
};

// Get running campaigns (within date range)
campaignSchema.statics.getRunning = function() {
  const now = new Date();
  
  return this.find({
    status: 'active',
    $or: [
      { 'schedule.startDate': { $lte: now } },
      { 'schedule.startDate': null },
    ],
    $or: [
      { 'schedule.endDate': { $gte: now } },
      { 'schedule.endDate': null },
    ],
  });
};

const Campaign = mongoose.model('Campaign', campaignSchema);

export default Campaign;
