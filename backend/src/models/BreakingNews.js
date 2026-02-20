import mongoose from 'mongoose';

/**
 * Breaking News Model
 * 
 * Real-time breaking news alerts
 * Pushed to all users via Socket.IO
 */

const breakingNewsSchema = new mongoose.Schema({
  // Title
  title: {
    type: String,
    required: true,
    maxlength: 150,
  },

  // Short summary
  summary: {
    type: String,
    required: true,
    maxlength: 300,
  },

  // Full article (optional)
  article: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Article',
  },

  // External URL (if not linking to article)
  url: String,

  // Image
  imageUrl: String,

  // Priority level
  priority: {
    type: String,
    enum: ['normal', 'high', 'critical'],
    default: 'normal',
  },

  // Status
  status: {
    type: String,
    enum: ['draft', 'active', 'expired'],
    default: 'draft',
  },

  // Auto-expire after this date
  expiresAt: {
    type: Date,
    required: true,
  },

  // Published date
  publishedAt: Date,

  // Statistics
  stats: {
    views: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    sent: { type: Number, default: 0 },
  },

  // Created by
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Indexes
breakingNewsSchema.index({ status: 1, publishedAt: -1 });
breakingNewsSchema.index({ expiresAt: 1 });

// METHODS

// Publish breaking news
breakingNewsSchema.methods.publish = async function() {
  this.status = 'active';
  this.publishedAt = new Date();
  await this.save();

  // Send to all users via Socket.IO
  if (global.socketService) {
    global.socketService.sendBreakingNews({
      id: this._id,
      title: this.title,
      summary: this.summary,
      url: this.url || `/articles/${this.article}`,
      imageUrl: this.imageUrl,
      priority: this.priority,
      publishedAt: this.publishedAt,
    });

    // Update sent count
    this.stats.sent = global.socketService.getOnlineCount();
    await this.save();
  }

  return this;
};

// Expire breaking news
breakingNewsSchema.methods.expire = async function() {
  this.status = 'expired';
  await this.save();
  return this;
};

// Increment view count
breakingNewsSchema.methods.incrementViews = async function() {
  this.stats.views += 1;
  await this.save();
};

// Increment click count
breakingNewsSchema.methods.incrementClicks = async function() {
  this.stats.clicks += 1;
  await this.save();
};

// STATICS

// Get active breaking news
breakingNewsSchema.statics.getActive = async function() {
  const now = new Date();
  
  return this.find({
    status: 'active',
    expiresAt: { $gt: now },
  })
    .sort({ publishedAt: -1 })
    .limit(5)
    .lean();
};

// Auto-expire old breaking news
breakingNewsSchema.statics.expireOld = async function() {
  const now = new Date();
  
  const result = await this.updateMany(
    {
      status: 'active',
      expiresAt: { $lt: now },
    },
    {
      status: 'expired',
    }
  );

  return result.modifiedCount;
};

// Get statistics
breakingNewsSchema.statics.getStats = async function(startDate, endDate) {
  const query = {};
  
  if (startDate || endDate) {
    query.publishedAt = {};
    if (startDate) query.publishedAt.$gte = startDate;
    if (endDate) query.publishedAt.$lte = endDate;
  }

  const stats = await this.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalSent: { $sum: '$stats.sent' },
        totalViews: { $sum: '$stats.views' },
        totalClicks: { $sum: '$stats.clicks' },
        avgViews: { $avg: '$stats.views' },
        avgClicks: { $avg: '$stats.clicks' },
        count: { $sum: 1 },
      },
    },
  ]);

  return stats[0] || {
    totalSent: 0,
    totalViews: 0,
    totalClicks: 0,
    avgViews: 0,
    avgClicks: 0,
    count: 0,
  };
};

const BreakingNews = mongoose.model('BreakingNews', breakingNewsSchema);

export default BreakingNews;
