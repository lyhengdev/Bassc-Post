import mongoose from 'mongoose';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Ad Model - Individual ads within a collection
 * 
 * Each ad belongs to ONE collection
 * Multiple ads can be in the same collection for A/B testing
 * 
 * SECURITY: HTML content is automatically sanitized before saving
 */
const adSchema = new mongoose.Schema({
  // PARENT COLLECTION
  collectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdCollection',
    required: true,
    index: true,
  },

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

  // CONTENT TYPE
  type: {
    type: String,
    required: true,
    enum: ['image', 'html', 'video'],
    default: 'image',
  },

  // IMAGE ADS
  imageUrl: {
    type: String,
    default: '',
  },
  mobileImageUrl: {
    type: String,
    default: '',
  },
  imageUrls: [{
    type: String, // For image carousel/slideshow
  }],
  slideIntervalMs: {
    type: Number,
    default: 3000,
    min: 1000,
  },

  // HTML ADS
  htmlContent: {
    type: String,
    default: '',
  },

  // VIDEO ADS
  videoUrl: {
    type: String,
    default: '',
  },

  // LINK
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

  // STYLING
  style: {
    type: String,
    enum: ['banner', 'card', 'native', 'fullwidth', 'inline'],
    default: 'banner',
  },
  size: {
    type: String,
    enum: ['small', 'medium', 'large', 'responsive'],
    default: 'responsive',
  },
  alignment: {
    type: String,
    enum: ['left', 'center', 'right'],
    default: 'center',
  },
  maxWidth: {
    type: Number,
    default: null,
  },
  backgroundColor: {
    type: String,
    default: '',
  },
  borderRadius: {
    type: Number,
    default: 8,
    min: 0,
    max: 50,
  },
  padding: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },

  // LABELS
  showLabel: {
    type: Boolean,
    default: true,
  },
  labelText: {
    type: String,
    default: 'Advertisement',
    maxLength: 50,
  },

  // ANIMATION
  animation: {
    type: String,
    enum: ['none', 'fade', 'slide', 'zoom'],
    default: 'fade',
  },

  // ROTATION WEIGHT (for weighted rotation)
  weight: {
    type: Number,
    default: 50,
    min: 0,
    max: 100,
  },

  // STATUS
  status: {
    type: String,
    enum: ['active', 'paused', 'testing', 'deleted'],
    default: 'active',
    index: true,
  },

  // ORDER (for manual/sequential ordering)
  order: {
    type: Number,
    default: 0,
  },

  // ALT TEXT (for accessibility)
  altText: {
    type: String,
    default: '',
    maxLength: 200,
  },

  // STATS (Individual ad performance)
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
    lastServed: {
      type: Date,
      default: null,
    },
  },

  // META
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// INDEXES
adSchema.index({ collectionId: 1, status: 1 });
adSchema.index({ collectionId: 1, order: 1 });
adSchema.index({ status: 1, weight: -1 });

// VIRTUALS
adSchema.virtual('collection', {
  ref: 'AdCollection',
  localField: 'collectionId',
  foreignField: '_id',
  justOne: true,
});

// METHODS
adSchema.methods.incrementImpression = async function() {
  this.stats.impressions += 1;
  this.stats.lastServed = new Date();
  this.stats.ctr = this.stats.impressions > 0 
    ? parseFloat(((this.stats.clicks / this.stats.impressions) * 100).toFixed(2))
    : 0;
  await this.save();
  
  // Also update parent collection stats
  const AdCollection = mongoose.model('AdCollection');
  const collection = await AdCollection.findById(this.collectionId);
  if (collection) {
    await collection.updateStats();
  }
};

adSchema.methods.incrementClick = async function() {
  this.stats.clicks += 1;
  this.stats.ctr = this.stats.impressions > 0 
    ? parseFloat(((this.stats.clicks / this.stats.impressions) * 100).toFixed(2))
    : 0;
  await this.save();
  
  // Also update parent collection stats
  const AdCollection = mongoose.model('AdCollection');
  const collection = await AdCollection.findById(this.collectionId);
  if (collection) {
    await collection.updateStats();
  }
};

// STATICS
adSchema.statics.selectFromCollection = async function(collectionId, rotationType = 'weighted') {
  const ads = await this.find({
    collectionId,
    status: 'active',
  }).sort({ order: 1, createdAt: 1 });

  if (ads.length === 0) return null;
  if (ads.length === 1) return ads[0];

  switch (rotationType) {
    case 'sequential':
      // Return first ad (rely on order field)
      return ads[0];

    case 'random':
      // Pick random ad
      return ads[Math.floor(Math.random() * ads.length)];

    case 'weighted': {
      // Weighted random selection
      const totalWeight = ads.reduce((sum, ad) => sum + (ad.weight || 50), 0);
      let random = Math.random() * totalWeight;
      
      for (const ad of ads) {
        random -= (ad.weight || 50);
        if (random <= 0) return ad;
      }
      return ads[0]; // Fallback
    }

    case 'ab_test':
      // Equal split for A/B testing
      return ads[Math.floor(Math.random() * ads.length)];

    default:
      return ads[0];
  }
};

adSchema.statics.getTopPerformers = async function(collectionId, limit = 5) {
  return await this.find({ collectionId, status: 'active' })
    .sort({ 'stats.ctr': -1, 'stats.impressions': -1 })
    .limit(limit);
};

// PRE-SAVE HOOK - Update CTR and Sanitize HTML
adSchema.pre('save', function(next) {
  // 1. Update CTR
  if (this.stats.impressions > 0) {
    this.stats.ctr = parseFloat(((this.stats.clicks / this.stats.impressions) * 100).toFixed(2));
  } else {
    this.stats.ctr = 0;
  }
  
  // 2. Sanitize HTML content (XSS protection)
  if (this.type === 'html' && this.htmlContent && this.isModified('htmlContent')) {
    this.htmlContent = DOMPurify.sanitize(this.htmlContent, {
      ALLOWED_TAGS: [
        'div', 'span', 'p', 'a', 'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'strong', 'em', 'br', 'hr', 'table', 'thead', 'tbody',
        'tr', 'td', 'th', 'button', 'form', 'input', 'label', 'select', 'option'
      ],
      ALLOWED_ATTR: [
        'href', 'src', 'alt', 'title', 'class', 'id', 'style', 'target',
        'rel', 'type', 'name', 'value', 'placeholder', 'data-*'
      ],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|ftp):\/\/|mailto:|tel:|data:image\/)/i,
      KEEP_CONTENT: true,
      ALLOW_DATA_ATTR: true,
    });
  }
  
  next();
});

const Ad = mongoose.model('Ad', adSchema);

export default Ad;
