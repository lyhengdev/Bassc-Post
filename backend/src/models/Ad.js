import mongoose from 'mongoose';

/**
 * Ad Model - Separate collection for advertisements
 * Moved from SiteSettings to its own collection for:
 * - Better scalability (no more hot writes to SiteSettings)
 * - Proper indexing for targeting queries
 * - No concurrency issues between admins
 * - Better reporting capabilities
 */
const adSchema = new mongoose.Schema({
  // Basic Info
  name: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 100
  },
  slug: {
    type: String,
    unique: true,
    sparse: true
  },
  status: { 
    type: String, 
    enum: ['draft', 'active', 'paused', 'archived'], 
    default: 'draft',
    index: true
  },
  
  // Ad Creative
  type: { 
    type: String, 
    enum: ['image', 'html', 'adsense', 'video'], 
    default: 'image' 
  },
  imageUrl: { type: String, default: '' },
  mobileImageUrl: { type: String, default: '' },
  linkUrl: { type: String, default: '' },
  linkTarget: { type: String, enum: ['_self', '_blank'], default: '_blank' },
  htmlContent: { type: String, default: '' }, // Sanitized on save
  videoUrl: { type: String, default: '' },
  altText: { type: String, default: '', maxlength: 200 },
  
  // Display Settings
  style: { 
    type: String, 
    enum: ['banner', 'card', 'native', 'fullwidth', 'inline'], 
    default: 'banner' 
  },
  size: { 
    type: String, 
    enum: ['small', 'medium', 'large', 'responsive'], 
    default: 'responsive' 
  },
  alignment: { 
    type: String, 
    enum: ['left', 'center', 'right'], 
    default: 'center' 
  },
  maxWidth: { type: Number, default: 728 },
  backgroundColor: { type: String, default: '' },
  borderRadius: { type: Number, default: 8 },
  padding: { type: Number, default: 16 },
  showLabel: { type: Boolean, default: true },
  labelText: { type: String, default: 'Advertisement' },
  animation: { 
    type: String, 
    enum: ['none', 'fade', 'slide', 'zoom'], 
    default: 'fade' 
  },
  
  // Placement Settings
  placement: { 
    type: String, 
    enum: [
      'after_hero',
      'between_sections',
      'in_article',
      'after_article',
      'before_comments',
      'in_category',
      'in_search',
      'floating_banner',
      'popup',
      'custom'
    ], 
    default: 'between_sections',
    index: true
  },
  placementId: { type: String, default: '' }, // For custom placements
  sectionIndex: { type: Number, default: 2 }, // For between_sections
  paragraphIndex: { type: Number, default: 3 }, // For in_article
  
  // Targeting
  targeting: {
    pages: { 
      type: String, 
      enum: ['all', 'homepage', 'articles', 'category', 'search', 'custom'], 
      default: 'all',
      index: true
    },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }], // Specific categories
    excludeCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    articles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Article' }], // Specific articles
    devices: {
      desktop: { type: Boolean, default: true },
      mobile: { type: Boolean, default: true },
      tablet: { type: Boolean, default: true }
    },
    userStatus: {
      loggedIn: { type: Boolean, default: true },
      guest: { type: Boolean, default: true }
    },
    geoTargeting: {
      enabled: { type: Boolean, default: false },
      countries: [String],
      excludeCountries: [String]
    }
  },
  
  // Scheduling
  schedule: {
    startDate: { type: Date, default: null, index: true },
    endDate: { type: Date, default: null, index: true },
    dayOfWeek: [{ type: Number, min: 0, max: 6 }], // 0=Sunday, 6=Saturday
    timeStart: { type: String, default: '' }, // HH:mm format
    timeEnd: { type: String, default: '' }
  },
  
  // Frequency Control
  frequency: {
    type: { 
      type: String, 
      enum: ['unlimited', 'once_per_page', 'once_per_session', 'once_per_day', 'once_per_user'], 
      default: 'unlimited' 
    },
    maxImpressions: { type: Number, default: 0 }, // 0 = unlimited
    maxClicks: { type: Number, default: 0 }
  },
  
  // Priority & Weight
  priority: { type: Number, default: 0, index: true }, // Higher = shows first
  weight: { type: Number, default: 100 }, // For weighted rotation (1-100)
  
  // Analytics (read-only, updated by AdEvents aggregation)
  stats: {
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 }, // Click-through rate
    lastImpression: { type: Date },
    lastClick: { type: Date }
  },
  
  // Metadata
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String, default: '' }, // Admin notes
  tags: [String], // For organization
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient ad selection queries
adSchema.index({ status: 1, 'schedule.startDate': 1, 'schedule.endDate': 1 });
adSchema.index({ placement: 1, status: 1, priority: -1 });
adSchema.index({ 'targeting.pages': 1, status: 1 });
adSchema.index({ createdAt: -1 });

// Generate slug from name
adSchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '-' + Date.now().toString(36);
  }
  next();
});

// Virtual for checking if ad is currently active
adSchema.virtual('isCurrentlyActive').get(function() {
  if (this.status !== 'active') return false;
  
  const now = new Date();
  if (this.schedule.startDate && now < this.schedule.startDate) return false;
  if (this.schedule.endDate && now > this.schedule.endDate) return false;
  
  return true;
});

// Static: Get active ads for a specific placement
adSchema.statics.getAdsForPlacement = async function(placement, options = {}) {
  const {
    pageType = 'all',
    device = 'desktop',
    isLoggedIn = false,
    categoryId = null,
    articleId = null,
    sectionIndex = null,
    paragraphIndex = null,
    limit = 5
  } = options;
  
  const now = new Date();
  
  const query = {
    status: 'active',
    placement,
    $or: [
      { 'schedule.startDate': null },
      { 'schedule.startDate': { $lte: now } }
    ],
    $and: [
      {
        $or: [
          { 'schedule.endDate': null },
          { 'schedule.endDate': { $gte: now } }
        ]
      }
    ]
  };
  
  // Page targeting
  if (pageType !== 'all') {
    query['$or'] = [
      { 'targeting.pages': 'all' },
      { 'targeting.pages': pageType }
    ];
  }
  
  // Device targeting
  const deviceField = `targeting.devices.${device}`;
  query[deviceField] = true;
  
  // User status targeting
  if (isLoggedIn) {
    query['targeting.userStatus.loggedIn'] = true;
  } else {
    query['targeting.userStatus.guest'] = true;
  }
  
  // Section/paragraph index for specific placements
  if (placement === 'between_sections' && sectionIndex !== null) {
    query.sectionIndex = sectionIndex;
  }
  if (placement === 'in_article' && paragraphIndex !== null) {
    query.paragraphIndex = paragraphIndex;
  }
  
  // Category targeting
  if (categoryId) {
    query['$and'].push({
      $or: [
        { 'targeting.categories': { $size: 0 } },
        { 'targeting.categories': categoryId }
      ]
    });
    query['targeting.excludeCategories'] = { $ne: categoryId };
  }
  
  const ads = await this.find(query)
    .sort({ priority: -1, weight: -1, createdAt: -1 })
    .limit(limit)
    .lean();
  
  return ads;
};

// Static: Get all active ads for public API
adSchema.statics.getActiveAds = async function() {
  const now = new Date();
  
  return this.find({
    status: 'active',
    $or: [
      { 'schedule.startDate': null },
      { 'schedule.startDate': { $lte: now } }
    ],
    $and: [
      {
        $or: [
          { 'schedule.endDate': null },
          { 'schedule.endDate': { $gte: now } }
        ]
      }
    ]
  })
  .sort({ placement: 1, priority: -1, weight: -1 })
  .lean();
};

const Ad = mongoose.model('Ad', adSchema);

export default Ad;
