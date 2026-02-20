import analyticsService from '../services/analyticsService.js';
import AnalyticsEvent from '../models/AnalyticsEvent.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

/**
 * Advanced Analytics Controller
 * 
 * Comprehensive analytics endpoints
 */

/**
 * Track event (public endpoint)
 * POST /api/analytics/track
 */
export const trackEvent = asyncHandler(async (req, res) => {
  try {
    const event = await analyticsService.trackEvent(req.body);
    return res.status(201).json({ success: true, eventId: event._id });
  } catch (error) {
    console.error('Track event error:', error);
    return res.status(500).json({ success: false, message: 'Failed to track event' });
  }
});

/**
 * Get real-time stats
 * GET /api/analytics/realtime
 */
export const getRealTimeStats = asyncHandler(async (req, res) => {
  const stats = await analyticsService.getRealTimeStats();
  return successResponse(res, { stats });
});

/**
 * Get overview statistics
 * GET /api/analytics/overview
 */
export const getOverview = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  const overview = await analyticsService.getOverview(start, end);
  
  return successResponse(res, { 
    overview,
    dateRange: { startDate: start, endDate: end },
  });
});

/**
 * Get time series data
 * GET /api/analytics/timeseries
 */
export const getTimeSeries = asyncHandler(async (req, res) => {
  const { startDate, endDate, interval = 'day' } = req.query;

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  const timeSeries = await analyticsService.getTimeSeries(start, end, interval);
  
  return successResponse(res, { timeSeries });
});

/**
 * Get content performance
 * GET /api/analytics/content-performance
 */
export const getContentPerformance = asyncHandler(async (req, res) => {
  const { startDate, endDate, limit = 50 } = req.query;

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  const performance = await analyticsService.getContentPerformance(start, end, parseInt(limit));
  
  return successResponse(res, { articles: performance });
});

/**
 * Get user journey
 * GET /api/analytics/journey/:sessionId
 */
export const getUserJourney = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const journey = await analyticsService.getUserJourney(sessionId);
  
  if (!journey.steps.length) {
    return errorResponse(res, 'Journey not found', 404);
  }

  return successResponse(res, { journey });
});

/**
 * Get funnel analysis
 * POST /api/analytics/funnel
 */
export const getFunnelAnalysis = asyncHandler(async (req, res) => {
  const { steps, startDate, endDate } = req.body;

  if (!steps || !Array.isArray(steps) || steps.length < 2) {
    return errorResponse(res, 'Invalid funnel steps', 400);
  }

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  const funnel = await analyticsService.getFunnelAnalysis(steps, start, end);
  
  return successResponse(res, { funnel });
});

/**
 * Get cohort analysis
 * GET /api/analytics/cohorts
 */
export const getCohortAnalysis = asyncHandler(async (req, res) => {
  const { startDate, endDate, type = 'week' } = req.query;

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  const cohorts = await analyticsService.getCohortAnalysis(start, end, type);
  
  return successResponse(res, { cohorts });
});

/**
 * Get search analytics
 * GET /api/analytics/search
 */
export const getSearchAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  const searches = await analyticsService.getSearchAnalytics(start, end);
  
  return successResponse(res, { searches });
});

/**
 * Get campaign performance
 * GET /api/analytics/campaigns
 */
export const getCampaignPerformance = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  const campaigns = await analyticsService.getCampaignPerformance(start, end);
  
  return successResponse(res, { campaigns });
});

/**
 * Get events by filters
 * GET /api/analytics/events
 */
export const getEvents = asyncHandler(async (req, res) => {
  const {
    eventType,
    userId,
    sessionId,
    startDate,
    endDate,
    page = 1,
    limit = 100,
  } = req.query;

  // Build filter
  const filter = {};
  if (eventType) filter.eventType = eventType;
  if (userId) filter.userId = userId;
  if (sessionId) filter.sessionId = sessionId;

  if (startDate || endDate) {
    filter.timestamp = {};
    if (startDate) filter.timestamp.$gte = new Date(startDate);
    if (endDate) filter.timestamp.$lte = new Date(endDate);
  }

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [events, total] = await Promise.all([
    AnalyticsEvent.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    AnalyticsEvent.countDocuments(filter),
  ]);

  return successResponse(res, {
    events,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

/**
 * Get traffic sources breakdown
 * GET /api/analytics/traffic-sources
 */
export const getTrafficSources = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  const sources = await AnalyticsEvent.getTrafficSources(start, end);
  
  return successResponse(res, { sources });
});

/**
 * Get device breakdown
 * GET /api/analytics/devices
 */
export const getDeviceBreakdown = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  const devices = await AnalyticsEvent.getDeviceBreakdown(start, end);
  
  return successResponse(res, { devices });
});

/**
 * Get location breakdown
 * GET /api/analytics/locations
 */
export const getLocationBreakdown = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  const locations = await AnalyticsEvent.aggregate([
    {
      $match: {
        timestamp: { $gte: start, $lte: end },
        'location.country': { $exists: true },
      },
    },
    {
      $group: {
        _id: {
          country: '$location.country',
          countryCode: '$location.countryCode',
        },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 },
    },
    {
      $limit: 50,
    },
  ]);

  return successResponse(res, { locations });
});

/**
 * Get hourly distribution
 * GET /api/analytics/hourly
 */
export const getHourlyDistribution = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  const hourly = await AnalyticsEvent.getHourlyDistribution(start, end);
  
  return successResponse(res, { hourly });
});

/**
 * Get engagement metrics
 * GET /api/analytics/engagement
 */
export const getEngagementMetrics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  const [avgScrollDepth, avgReadingTime] = await Promise.all([
    AnalyticsEvent.aggregate([
      {
        $match: {
          eventType: 'scroll_depth',
          timestamp: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          avgDepth: { $avg: '$properties.engagement.scrollDepth' },
        },
      },
    ]).then(result => result[0]?.avgDepth || 0),
    AnalyticsEvent.aggregate([
      {
        $match: {
          eventType: 'reading_time',
          timestamp: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          avgTime: { $avg: '$properties.engagement.readingTime' },
        },
      },
    ]).then(result => result[0]?.avgTime || 0),
  ]);

  return successResponse(res, {
    avgScrollDepth: Math.round(avgScrollDepth),
    avgReadingTime: Math.round(avgReadingTime),
  });
});

/**
 * Export analytics data
 * GET /api/analytics/export
 */
export const exportAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate, format = 'json' } = req.query;

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  const data = await analyticsService.getOverview(start, end);

  if (format === 'csv') {
    // Convert to CSV (simplified)
    const csv = 'Metric,Value\n' + Object.entries(data)
      .map(([key, value]) => `${key},${JSON.stringify(value)}`)
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=analytics.csv');
    return res.send(csv);
  }

  return successResponse(res, data);
});

export default {
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
};
