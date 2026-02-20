import mongoose from 'mongoose';

/**
 * Subscription Model
 * 
 * Manages user subscriptions and access control
 */

const subscriptionSchema = new mongoose.Schema({
  // User
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },

  // Plan
  plan: {
    type: String,
    enum: ['free', 'basic', 'premium', 'enterprise'],
    default: 'free',
    required: true,
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired', 'trial', 'paused'],
    default: 'active',
    required: true,
  },

  // Billing
  billing: {
    interval: {
      type: String,
      enum: ['monthly', 'yearly', 'lifetime'],
      default: 'monthly',
    },
    amount: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    nextBillingDate: Date,
    lastBillingDate: Date,
  },

  // Payment provider
  paymentProvider: {
    type: String,
    enum: ['stripe', 'paypal', 'manual', 'free'],
    default: 'free',
  },

  // Stripe integration
  stripeCustomerId: String,
  stripeSubscriptionId: String,
  stripePriceId: String,

  // Trial
  trial: {
    isActive: {
      type: Boolean,
      default: false,
    },
    startDate: Date,
    endDate: Date,
    daysRemaining: {
      type: Number,
      default: 0,
    },
  },

  // Access limits
  limits: {
    articlesPerMonth: {
      type: Number,
      default: 5, // Free tier
    },
    currentArticlesRead: {
      type: Number,
      default: 0,
    },
    lastResetDate: {
      type: Date,
      default: Date.now,
    },
  },

  // Features
  features: {
    adFree: {
      type: Boolean,
      default: false,
    },
    offlineReading: {
      type: Boolean,
      default: false,
    },
    exclusiveContent: {
      type: Boolean,
      default: false,
    },
    premiumArticles: {
      type: Boolean,
      default: false,
    },
    newsletter: {
      type: Boolean,
      default: true,
    },
    analytics: {
      type: Boolean,
      default: false,
    },
  },

  // Dates
  startDate: {
    type: Date,
    default: Date.now,
  },

  endDate: Date,

  cancelledAt: Date,
  cancelReason: String,

  // Auto-renewal
  autoRenew: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes
subscriptionSchema.index({ userId: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ plan: 1 });
subscriptionSchema.index({ 'billing.nextBillingDate': 1 });
subscriptionSchema.index({ stripeCustomerId: 1 });
subscriptionSchema.index({ stripeSubscriptionId: 1 });

// VIRTUAL FIELDS

// Check if subscription is active
subscriptionSchema.virtual('isActive').get(function() {
  return this.status === 'active' || this.status === 'trial';
});

// Check if trial is active
subscriptionSchema.virtual('isTrialActive').get(function() {
  if (!this.trial.isActive) return false;
  
  const now = new Date();
  return now < this.trial.endDate;
});

// Check if user has reached article limit
subscriptionSchema.virtual('hasReachedLimit').get(function() {
  // Unlimited for paid plans
  if (this.plan !== 'free') return false;
  
  return this.limits.currentArticlesRead >= this.limits.articlesPerMonth;
});

// METHODS

// Check if user can access article
subscriptionSchema.methods.canAccessArticle = function(article) {
  // Free articles are accessible to everyone
  if (!article.isPremium) {
    return true;
  }

  // Premium articles require subscription
  if (this.plan === 'free') {
    // Check if user has free articles remaining
    if (this.hasReachedLimit) {
      return false;
    }
  }

  return true;
};

// Increment article read count
subscriptionSchema.methods.incrementArticleRead = async function() {
  // Reset counter if month has passed
  const now = new Date();
  const lastReset = new Date(this.limits.lastResetDate);
  
  if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
    this.limits.currentArticlesRead = 0;
    this.limits.lastResetDate = now;
  }

  this.limits.currentArticlesRead += 1;
  await this.save();
};

// Upgrade plan
subscriptionSchema.methods.upgradePlan = async function(newPlan, billingInterval = 'monthly') {
  const planConfig = getSubscriptionPlans()[newPlan];
  
  if (!planConfig) {
    throw new Error('Invalid plan');
  }

  this.plan = newPlan;
  this.status = 'active';
  this.billing.interval = billingInterval;
  this.billing.amount = billingInterval === 'yearly' 
    ? planConfig.yearlyPrice 
    : planConfig.monthlyPrice;

  // Update features
  this.features = { ...planConfig.features };

  // Update limits
  this.limits.articlesPerMonth = planConfig.articlesPerMonth;

  // Set billing dates
  this.startDate = new Date();
  this.billing.nextBillingDate = new Date();
  
  if (billingInterval === 'yearly') {
    this.billing.nextBillingDate.setFullYear(this.billing.nextBillingDate.getFullYear() + 1);
  } else {
    this.billing.nextBillingDate.setMonth(this.billing.nextBillingDate.getMonth() + 1);
  }

  await this.save();
  return this;
};

// Cancel subscription
subscriptionSchema.methods.cancel = async function(reason = null) {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancelReason = reason;
  this.autoRenew = false;

  await this.save();
  return this;
};

// Reactivate subscription
subscriptionSchema.methods.reactivate = async function() {
  if (this.status !== 'cancelled') {
    throw new Error('Can only reactivate cancelled subscriptions');
  }

  this.status = 'active';
  this.cancelledAt = null;
  this.cancelReason = null;
  this.autoRenew = true;

  await this.save();
  return this;
};

// Start trial
subscriptionSchema.methods.startTrial = async function(days = 14) {
  const now = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);

  this.status = 'trial';
  this.trial = {
    isActive: true,
    startDate: now,
    endDate: endDate,
    daysRemaining: days,
  };

  // Give premium features during trial
  this.features = getSubscriptionPlans()['premium'].features;

  await this.save();
  return this;
};

// STATICS

// Get or create subscription for user
subscriptionSchema.statics.getOrCreate = async function(userId) {
  let subscription = await this.findOne({ userId });
  
  if (!subscription) {
    subscription = await this.create({
      userId,
      plan: 'free',
      status: 'active',
    });
  }

  return subscription;
};

// Get active subscriptions
subscriptionSchema.statics.getActive = async function() {
  return this.find({
    status: { $in: ['active', 'trial'] },
  });
};

// Get subscriptions expiring soon
subscriptionSchema.statics.getExpiringSoon = async function(days = 7) {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  return this.find({
    status: 'active',
    'billing.nextBillingDate': {
      $gte: now,
      $lte: futureDate,
    },
  });
};

const Subscription = mongoose.model('Subscription', subscriptionSchema);

// ==================== SUBSCRIPTION PLANS ====================

export const getSubscriptionPlans = () => ({
  free: {
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    articlesPerMonth: 5,
    features: {
      adFree: false,
      offlineReading: false,
      exclusiveContent: false,
      premiumArticles: false,
      newsletter: true,
      analytics: false,
    },
    description: '5 articles per month',
  },
  basic: {
    name: 'Basic',
    monthlyPrice: 9.99,
    yearlyPrice: 99,
    articlesPerMonth: -1, // Unlimited
    features: {
      adFree: true,
      offlineReading: true,
      exclusiveContent: false,
      premiumArticles: true,
      newsletter: true,
      analytics: false,
    },
    description: 'Unlimited articles, ad-free',
  },
  premium: {
    name: 'Premium',
    monthlyPrice: 19.99,
    yearlyPrice: 199,
    articlesPerMonth: -1, // Unlimited
    features: {
      adFree: true,
      offlineReading: true,
      exclusiveContent: true,
      premiumArticles: true,
      newsletter: true,
      analytics: true,
    },
    description: 'All features + exclusive content',
  },
  enterprise: {
    name: 'Enterprise',
    monthlyPrice: 99.99,
    yearlyPrice: 999,
    articlesPerMonth: -1, // Unlimited
    features: {
      adFree: true,
      offlineReading: true,
      exclusiveContent: true,
      premiumArticles: true,
      newsletter: true,
      analytics: true,
    },
    description: 'For organizations',
  },
});

export default Subscription;
