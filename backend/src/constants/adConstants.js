/**
 * Shared Ad System Constants
 * Used across Ad and AdEvent models to ensure consistency
 */

// Page types for targeting and tracking
export const PAGE_TYPES = [
  'homepage',
  'article',
  'category',
  'search',
  'page',
  'other',
];

// Target pages includes 'all' and 'custom' for targeting configuration
export const TARGET_PAGES = ['all', ...PAGE_TYPES, 'custom'];

// Ad types
export const AD_TYPES = ['image', 'html', 'video'];

// Ad placements
export const AD_PLACEMENTS = [
  'header',
  'sidebar',
  'footer',
  'in-article',
  'between-articles',
  'popup',
  'custom',
];

// Ad statuses
export const AD_STATUSES = ['active', 'paused', 'expired', 'draft'];

// Event types
export const EVENT_TYPES = ['impression', 'click', 'viewable', 'conversion'];

// Device types
export const DEVICE_TYPES = ['desktop', 'mobile', 'tablet'];

// Frequency control modes
export const FREQUENCY_MODES = [
  'per_page', // Once per page load
  'per_session', // Once per session
  'per_day', // Once per day per user
  'per_user', // Once ever per user
  'unlimited', // No frequency control
];

// Default cache durations (in seconds)
export const CACHE_DURATIONS = {
  adSelection: 300, // 5 minutes
  adStats: 180, // 3 minutes
  adConfig: 600, // 10 minutes
};

// Rate limiting thresholds for fraud detection
export const FRAUD_THRESHOLDS = {
  clicksPerMinute: 5, // Max clicks per minute from same source
  impressionsPerMinute: 10, // Max impressions per minute from same source
  clickImpressionRatio: 1.0, // Clicks should not exceed impressions
};

// Ad stats aggregation schedule
export const STATS_AGGREGATION = {
  hour: 1, // Run at 1 AM
  minute: 0,
  timezone: 'Asia/Phnom_Penh',
};

export default {
  PAGE_TYPES,
  TARGET_PAGES,
  AD_TYPES,
  AD_PLACEMENTS,
  AD_STATUSES,
  EVENT_TYPES,
  DEVICE_TYPES,
  FREQUENCY_MODES,
  CACHE_DURATIONS,
  FRAUD_THRESHOLDS,
  STATS_AGGREGATION,
};
