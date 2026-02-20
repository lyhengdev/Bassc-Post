import express from 'express';
import {
  trackEvent,
  getRealTimeStats,
  getOverview,
  getTimeSeries,
  getContentPerformance,
  getUserJourney,
  getFunnelAnalysis,
  getCohortAnalysis,
  getSearchAnalytics,
  getCampaignPerformance,
  getEvents,
  getTrafficSources,
  getDeviceBreakdown,
  getLocationBreakdown,
  getHourlyDistribution,
  getEngagementMetrics,
  exportAnalytics,
} from '../controllers/advancedAnalyticsController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// ==================== PUBLIC ENDPOINTS ====================

// Track event (public)
router.post('/track', trackEvent);

// ==================== PROTECTED ENDPOINTS ====================

// All routes below require authentication
router.use(authenticate);

// Real-time stats (admin/editor)
router.get(
  '/realtime',
  authorize(['admin', 'editor']),
  getRealTimeStats
);

// Overview
router.get(
  '/overview',
  authorize(['admin', 'editor']),
  getOverview
);

// Time series
router.get(
  '/timeseries',
  authorize(['admin', 'editor']),
  getTimeSeries
);

// Content performance
router.get(
  '/content-performance',
  authorize(['admin', 'editor']),
  getContentPerformance
);

// User journey
router.get(
  '/journey/:sessionId',
  authorize(['admin', 'editor']),
  getUserJourney
);

// Funnel analysis
router.post(
  '/funnel',
  authorize(['admin', 'editor']),
  getFunnelAnalysis
);

// Cohort analysis
router.get(
  '/cohorts',
  authorize(['admin', 'editor']),
  getCohortAnalysis
);

// Search analytics
router.get(
  '/search',
  authorize(['admin', 'editor']),
  getSearchAnalytics
);

// Campaign performance
router.get(
  '/campaigns',
  authorize(['admin', 'editor']),
  getCampaignPerformance
);

// Events list
router.get(
  '/events',
  authorize(['admin']),
  getEvents
);

// Traffic sources
router.get(
  '/traffic-sources',
  authorize(['admin', 'editor']),
  getTrafficSources
);

// Device breakdown
router.get(
  '/devices',
  authorize(['admin', 'editor']),
  getDeviceBreakdown
);

// Location breakdown
router.get(
  '/locations',
  authorize(['admin', 'editor']),
  getLocationBreakdown
);

// Hourly distribution
router.get(
  '/hourly',
  authorize(['admin', 'editor']),
  getHourlyDistribution
);

// Engagement metrics
router.get(
  '/engagement',
  authorize(['admin', 'editor']),
  getEngagementMetrics
);

// Export
router.get(
  '/export',
  authorize(['admin']),
  exportAnalytics
);

export default router;
