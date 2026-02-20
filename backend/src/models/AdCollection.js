import mongoose from 'mongoose';

/**
 * AdCollection Model - Campaign-based ad management
 * 
 * Each collection represents ONE placement/campaign with multiple ads
 * Example: "Homepage Hero Banner" collection with 3 different ad variations
 */
const adCollectionSchema = new mongoose.Schema({
  // BASIC INFO
  name: {
    type: String,
    required: true,
    trim: true,
    maxLength: 200,
  },
  description: {
    type: String,
    default: '',
    maxLength: 500,
  },

  // PLACEMENT (Only ONE per collection!)
  placement: {
    type: String,
    required: true,
    enum: [
      'popup',
      'header',
      'footer',
      'sidebar',
      'in_article',
      'after_article',
      'before_comments',
      'after_hero',
      'between_sections',
      'floating_banner',
      'in_category',
      'in_search',
    ],
    index: true,
  },

  // CUSTOM PLACEMENT (if placement = 'custom')
  placementId: {
    type: String,
    default: '',
  },

  // HOMEPAGE BETWEEN-SECTIONS TARGETING (optional)
  sectionIndex: {
    type: Number,
    default: null,
    min: 0,
  },

  // PAGE TARGETING (Multiple pages allowed)
  targetPages: [{
    type: String,
    enum: ['all', 'homepage', 'article', 'category', 'search', 'page', 'other'],
  }],

  // TARGETING OPTIONS
  targetDevices: [{
    type: String,
    enum: ['desktop', 'mobile', 'tablet'],
    default: ['desktop', 'mobile', 'tablet'],
  }],

  targetUserTypes: [{
    type: String,
    enum: ['all', 'guest', 'logged_in'],
    default: ['all'],
  }],

  targetCountries: [{
    type: String, // ISO country codes: 'KH', 'US', 'all', etc.
    default: ['all'],
  }],

  // Category targeting (optional)
  targetCategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
  }],

  // ROTATION STRATEGY
  rotationType: {
    type: String,
    enum: ['sequential', 'random', 'weighted', 'ab_test'],
    default: 'weighted',
  },

  // FREQUENCY CONTROL (Collection-level)
  frequency: {
    type: {
      type: String,
      enum: ['unlimited', 'once_per_page', 'once_per_session', 'once_per_day', 'once_per_user'],
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
    daysOfWeek: [{
      type: Number, // 0-6 (Sunday-Saturday)
      min: 0,
      max: 6,
    }],
    timeStart: {
      type: String, // "09:00"
      default: null,
    },
    timeEnd: {
      type: String, // "17:00"
      default: null,
    },
    timezone: {
      type: String,
      default: 'Asia/Phnom_Penh',
    },
  },

  // POPUP-SPECIFIC SETTINGS
  popupSettings: {
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

  // STATUS
  status: {
    type: String,
    enum: ['active', 'paused', 'scheduled', 'ended', 'draft'],
    default: 'active',
    index: true,
  },

  // PRIORITY (for when multiple collections match)
  priority: {
    type: Number,
    default: 1,
    min: 1,
    max: 10,
  },

  // STATS (Aggregated from all ads in collection)
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
    lastServed: {
      type: Date,
      default: null,
    },
    activeAdsCount: {
      type: Number,
      default: 0,
    },
  },

  // META
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
});

// INDEXES
adCollectionSchema.index({ status: 1, placement: 1 });
adCollectionSchema.index({ 'schedule.startDate': 1, 'schedule.endDate': 1 });
adCollectionSchema.index({ createdBy: 1 });

// VIRTUALS
adCollectionSchema.virtual('ads', {
  ref: 'Ad',
  localField: '_id',
  foreignField: 'collectionId',
});

// METHODS
adCollectionSchema.methods.isActive = function() {
  const now = new Date();
  
  // Check status
  if (this.status !== 'active') return false;
  
  // Check schedule
  if (this.schedule.startDate && now < this.schedule.startDate) return false;
  if (this.schedule.endDate && now > this.schedule.endDate) return false;
  
  // Check day of week
  if (this.schedule.daysOfWeek && this.schedule.daysOfWeek.length > 0) {
    const currentDay = now.getDay();
    if (!this.schedule.daysOfWeek.includes(currentDay)) return false;
  }
  
  // Check time range
  if (this.schedule.timeStart && this.schedule.timeEnd) {
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (currentTime < this.schedule.timeStart || currentTime > this.schedule.timeEnd) {
      return false;
    }
  }
  
  return true;
};

adCollectionSchema.methods.matchesContext = function(context) {
  const {
    pageType = 'other',
    device = 'desktop',
    isLoggedIn = false,
    country = 'all',
    categoryId = null,
    placementId = null,
    sectionIndex = null,
  } = context;
  
  // Check page targeting
  if (!this.targetPages.includes('all') && !this.targetPages.includes(pageType)) {
    return false;
  }

  // Check custom placement targeting
  if (this.placement === 'custom' && this.placementId) {
    if (!placementId) return false;
    if (this.placementId !== placementId) return false;
  }

  // Check between-sections targeting
  if (this.placement === 'between_sections' && Number.isInteger(this.sectionIndex)) {
    if (sectionIndex === null || sectionIndex === undefined) return false;
    if (Number(sectionIndex) !== this.sectionIndex) return false;
  }
  
  // Check device
  if (!this.targetDevices.includes(device)) {
    return false;
  }
  
  // Check user type
  const userType = isLoggedIn ? 'logged_in' : 'guest';
  if (!this.targetUserTypes.includes('all') && !this.targetUserTypes.includes(userType)) {
    return false;
  }
  
  // Check country
  if (!this.targetCountries.includes('all') && !this.targetCountries.includes(country)) {
    return false;
  }
  
  // Check category (if targeting specific categories)
  if (this.targetCategories && this.targetCategories.length > 0 && categoryId) {
    const categoryIdStr = categoryId.toString();
    const hasMatch = this.targetCategories.some(cat => cat.toString() === categoryIdStr);
    if (!hasMatch) return false;
  }
  
  return true;
};

// STATICS
adCollectionSchema.statics.findActiveForPlacement = async function(placement, context = {}) {
  const collections = await this.find({
    status: 'active',
    placement,
  })
    .populate('ads')
    .sort({ priority: -1, createdAt: -1 });
  
  // Filter by schedule and context
  const activeCollections = collections.filter(collection => {
    return collection.isActive() && collection.matchesContext(context);
  });
  
  return activeCollections;
};

adCollectionSchema.statics.getCollectionWithAds = async function(collectionId) {
  const Ad = mongoose.model('Ad');
  
  const collection = await this.findById(collectionId);
  if (!collection) return null;
  
  const ads = await Ad.find({ collectionId, status: { $ne: 'deleted' } })
    .sort({ order: 1, createdAt: 1 });
  
  return {
    ...collection.toObject(),
    ads,
  };
};

// Update stats
adCollectionSchema.methods.updateStats = async function() {
  const Ad = mongoose.model('Ad');
  
  const ads = await Ad.find({ collectionId: this._id, status: 'active' });
  
  const stats = ads.reduce((acc, ad) => {
    acc.totalImpressions += ad.stats.impressions || 0;
    acc.totalClicks += ad.stats.clicks || 0;
    return acc;
  }, { totalImpressions: 0, totalClicks: 0 });
  
  stats.ctr = stats.totalImpressions > 0 
    ? parseFloat(((stats.totalClicks / stats.totalImpressions) * 100).toFixed(2))
    : 0;
  
  stats.activeAdsCount = ads.length;
  
  this.stats = stats;
  await this.save();
  
  return stats;
};

const AdCollection = mongoose.model('AdCollection', adCollectionSchema);

export default AdCollection;
