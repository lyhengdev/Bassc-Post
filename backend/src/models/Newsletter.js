import mongoose from 'mongoose';
import crypto from 'crypto';

const newsletterSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'unsubscribed'],
      default: 'pending',
    },
    confirmToken: {
      type: String,
      select: false,
    },
    confirmedAt: {
      type: Date,
      default: null,
    },
    unsubscribedAt: {
      type: Date,
      default: null,
    },
    unsubscribeToken: {
      type: String,
      select: false,
    },
    source: {
      type: String,
      enum: ['website', 'article', 'popup', 'footer', 'other'],
      default: 'website',
    },
    preferences: {
      dailyDigest: { type: Boolean, default: true },
      weeklyNewsletter: { type: Boolean, default: true },
      breakingNews: { type: Boolean, default: false },
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

// Indexes (email unique index is auto-created)
newsletterSchema.index({ status: 1 });
newsletterSchema.index({ createdAt: -1 });

// Pre-save hook to generate tokens
newsletterSchema.pre('save', function (next) {
  if (this.isNew) {
    this.confirmToken = crypto.randomBytes(32).toString('hex');
    this.unsubscribeToken = crypto.randomBytes(32).toString('hex');
  }
  next();
});

// Static method to get active subscribers
newsletterSchema.statics.getActiveSubscribers = function () {
  return this.find({ status: 'confirmed' });
};

// Static method to get subscriber stats
newsletterSchema.statics.getStats = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const result = {
    total: 0,
    pending: 0,
    confirmed: 0,
    unsubscribed: 0,
  };

  stats.forEach((s) => {
    result[s._id] = s.count;
    result.total += s.count;
  });

  return result;
};

const Newsletter = mongoose.model('Newsletter', newsletterSchema);

export default Newsletter;
