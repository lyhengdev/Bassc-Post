import AnalyticsEvent from '../models/AnalyticsEvent.js';
import Article from '../models/Article.js';

/**
 * Advanced Analytics Service
 * 
 * Provides comprehensive analytics features:
 * - Real-time tracking
 * - Cohort analysis
 * - Funnel analysis
 * - Content performance
 * - User journey
 */

class AnalyticsService {
  /**
   * Track event
   */
  async trackEvent(eventData) {
    try {
      const event = await AnalyticsEvent.create(eventData);
      return event;
    } catch (error) {
      console.error('Track event error:', error);
      throw error;
    }
  }

  /**
   * Get real-time stats (last 24 hours)
   */
  async getRealTimeStats() {
    const now = new Date();
    const last24Hours = new Date(now - 24 * 60 * 60 * 1000);

    const [
      totalEvents,
      uniqueUsers,
      uniqueSessions,
      pageViews,
      activeUsers, // Last 5 minutes
    ] = await Promise.all([
      AnalyticsEvent.countDocuments({
        timestamp: { $gte: last24Hours },
      }),
      AnalyticsEvent.getUniqueUsers(last24Hours, now),
      AnalyticsEvent.getUniqueSessions(last24Hours, now),
      AnalyticsEvent.countDocuments({
        eventType: 'page_view',
        timestamp: { $gte: last24Hours },
      }),
      AnalyticsEvent.getUniqueUsers(
        new Date(now - 5 * 60 * 1000),
        now
      ),
    ]);

    // Get events per minute (last hour)
    const lastHour = new Date(now - 60 * 60 * 1000);
    const eventsPerMinute = await AnalyticsEvent.aggregate([
      {
        $match: {
          timestamp: { $gte: lastHour },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d %H:%M',
              date: '$timestamp',
            },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    return {
      totalEvents,
      uniqueUsers,
      uniqueSessions,
      pageViews,
      activeUsers,
      eventsPerMinute,
      timestamp: now,
    };
  }

  /**
   * Get overview statistics
   */
  async getOverview(startDate, endDate) {
    const [
      totalViews,
      uniqueUsers,
      uniqueSessions,
      eventCounts,
      trafficSources,
      deviceBreakdown,
      topArticles,
    ] = await Promise.all([
      AnalyticsEvent.countDocuments({
        eventType: 'page_view',
        timestamp: { $gte: startDate, $lte: endDate },
      }),
      AnalyticsEvent.getUniqueUsers(startDate, endDate),
      AnalyticsEvent.getUniqueSessions(startDate, endDate),
      AnalyticsEvent.getEventCounts(startDate, endDate),
      AnalyticsEvent.getTrafficSources(startDate, endDate),
      AnalyticsEvent.getDeviceBreakdown(startDate, endDate),
      AnalyticsEvent.getTopArticles(startDate, endDate, 10),
    ]);

    // Calculate engagement metrics
    const avgSessionDuration = await this.getAverageSessionDuration(startDate, endDate);
    const bounceRate = await this.getBounceRate(startDate, endDate);

    return {
      totalViews,
      uniqueUsers,
      uniqueSessions,
      avgSessionDuration,
      bounceRate,
      eventCounts,
      trafficSources,
      deviceBreakdown,
      topArticles,
    };
  }

  /**
   * Get time series data
   */
  async getTimeSeries(startDate, endDate, interval = 'day') {
    const groupFormat = {
      hour: '%Y-%m-%d %H:00',
      day: '%Y-%m-%d',
      week: '%Y-W%V',
      month: '%Y-%m',
    }[interval] || '%Y-%m-%d';

    const timeSeries = await AnalyticsEvent.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: groupFormat,
                date: '$timestamp',
              },
            },
            eventType: '$eventType',
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.date',
          events: {
            $push: {
              type: '$_id.eventType',
              count: '$count',
            },
          },
          total: { $sum: '$count' },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    return timeSeries;
  }

  /**
   * Content Performance Analysis
   */
  async getContentPerformance(startDate, endDate, limit = 50) {
    const articles = await AnalyticsEvent.aggregate([
      {
        $match: {
          'article._id': { $exists: true },
          timestamp: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$article._id',
          article: { $first: '$article' },
          views: {
            $sum: {
              $cond: [{ $eq: ['$eventType', 'article_view'] }, 1, 0],
            },
          },
          reads: {
            $sum: {
              $cond: [{ $eq: ['$eventType', 'article_read'] }, 1, 0],
            },
          },
          shares: {
            $sum: {
              $cond: [{ $eq: ['$eventType', 'article_share'] }, 1, 0],
            },
          },
          comments: {
            $sum: {
              $cond: [{ $eq: ['$eventType', 'article_comment'] }, 1, 0],
            },
          },
          avgReadingTime: {
            $avg: {
              $cond: [
                { $eq: ['$eventType', 'reading_time'] },
                '$properties.engagement.readingTime',
                null,
              ],
            },
          },
          avgScrollDepth: {
            $avg: {
              $cond: [
                { $eq: ['$eventType', 'scroll_depth'] },
                '$properties.engagement.scrollDepth',
                null,
              ],
            },
          },
        },
      },
      {
        $addFields: {
          readRate: {
            $cond: [
              { $gt: ['$views', 0] },
              { $multiply: [{ $divide: ['$reads', '$views'] }, 100] },
              0,
            ],
          },
          engagementScore: {
            $add: [
              { $multiply: ['$views', 1] },
              { $multiply: ['$reads', 5] },
              { $multiply: ['$shares', 10] },
              { $multiply: ['$comments', 15] },
            ],
          },
        },
      },
      {
        $sort: { engagementScore: -1 },
      },
      {
        $limit: limit,
      },
    ]);

    return articles;
  }

  /**
   * User Journey Analysis
   */
  async getUserJourney(sessionId) {
    const events = await AnalyticsEvent.find({ sessionId })
      .sort({ timestamp: 1 })
      .select('eventType properties timestamp')
      .lean();

    // Build journey path
    const journey = {
      sessionId,
      startTime: events[0]?.timestamp,
      endTime: events[events.length - 1]?.timestamp,
      duration: events.length > 0
        ? Math.floor((events[events.length - 1].timestamp - events[0].timestamp) / 1000)
        : 0,
      steps: events.map((event, index) => ({
        step: index + 1,
        eventType: event.eventType,
        page: event.properties?.page,
        article: event.properties?.article,
        timestamp: event.timestamp,
      })),
      metrics: {
        totalSteps: events.length,
        pagesVisited: new Set(events.map(e => e.properties?.page?.path).filter(Boolean)).size,
        articlesRead: events.filter(e => e.eventType === 'article_read').length,
      },
    };

    return journey;
  }

  /**
   * Funnel Analysis
   */
  async getFunnelAnalysis(funnelSteps, startDate, endDate) {
    // funnelSteps = ['page_view', 'article_view', 'article_read', 'newsletter_subscribe']
    
    const results = [];
    let previousCount = null;

    for (let i = 0; i < funnelSteps.length; i++) {
      const step = funnelSteps[i];
      
      // Count users who completed this step
      const count = await AnalyticsEvent.distinct('sessionId', {
        eventType: step,
        timestamp: { $gte: startDate, $lte: endDate },
      }).then(sessions => sessions.length);

      // Calculate conversion rate
      const conversionRate = previousCount
        ? ((count / previousCount) * 100).toFixed(2)
        : 100;

      // Calculate drop-off
      const dropOff = previousCount
        ? previousCount - count
        : 0;

      results.push({
        step: i + 1,
        name: step,
        count,
        conversionRate: parseFloat(conversionRate),
        dropOff,
      });

      previousCount = count;
    }

    return results;
  }

  /**
   * Cohort Analysis
   */
  async getCohortAnalysis(startDate, endDate, cohortType = 'week') {
    const groupFormat = cohortType === 'week' ? '%Y-W%V' : '%Y-%m';

    // Get users grouped by signup cohort
    const cohorts = await AnalyticsEvent.aggregate([
      {
        $match: {
          eventType: 'user_signup',
          timestamp: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            cohort: {
              $dateToString: {
                format: groupFormat,
                date: '$timestamp',
              },
            },
            userId: '$userId',
          },
        },
      },
      {
        $group: {
          _id: '$_id.cohort',
          users: { $addToSet: '$_id.userId' },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // For each cohort, track retention over time
    const cohortData = await Promise.all(
      cohorts.map(async (cohort) => {
        const retention = [];
        const cohortStartDate = new Date(cohort._id);

        // Track retention for next 12 periods
        for (let period = 0; period < 12; period++) {
          const periodStart = new Date(cohortStartDate);
          const periodEnd = new Date(cohortStartDate);

          if (cohortType === 'week') {
            periodStart.setDate(periodStart.getDate() + period * 7);
            periodEnd.setDate(periodEnd.getDate() + (period + 1) * 7);
          } else {
            periodStart.setMonth(periodStart.getMonth() + period);
            periodEnd.setMonth(periodEnd.getMonth() + period + 1);
          }

          // Count active users from this cohort in this period
          const activeUsers = await AnalyticsEvent.distinct('userId', {
            userId: { $in: cohort.users },
            timestamp: { $gte: periodStart, $lt: periodEnd },
          }).then(users => users.length);

          retention.push({
            period,
            activeUsers,
            retentionRate: ((activeUsers / cohort.users.length) * 100).toFixed(2),
          });
        }

        return {
          cohort: cohort._id,
          totalUsers: cohort.users.length,
          retention,
        };
      })
    );

    return cohortData;
  }

  /**
   * Search Analytics
   */
  async getSearchAnalytics(startDate, endDate) {
    const searches = await AnalyticsEvent.aggregate([
      {
        $match: {
          eventType: 'search',
          timestamp: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$properties.search.query',
          count: { $sum: 1 },
          avgResults: { $avg: '$properties.search.resultsCount' },
          clickThroughRate: {
            $avg: {
              $cond: [
                { $ne: ['$properties.search.resultClicked', null] },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 100,
      },
    ]);

    return searches;
  }

  /**
   * Get average session duration
   */
  async getAverageSessionDuration(startDate, endDate) {
    const sessions = await AnalyticsEvent.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$sessionId',
          start: { $min: '$timestamp' },
          end: { $max: '$timestamp' },
        },
      },
      {
        $project: {
          duration: {
            $divide: [{ $subtract: ['$end', '$start'] }, 1000],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgDuration: { $avg: '$duration' },
        },
      },
    ]);

    return Math.round(sessions[0]?.avgDuration || 0);
  }

  /**
   * Get bounce rate
   */
  async getBounceRate(startDate, endDate) {
    // Bounce = session with only 1 page view
    const [totalSessions, bouncedSessions] = await Promise.all([
      AnalyticsEvent.distinct('sessionId', {
        timestamp: { $gte: startDate, $lte: endDate },
      }).then(sessions => sessions.length),
      AnalyticsEvent.aggregate([
        {
          $match: {
            timestamp: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: '$sessionId',
            count: { $sum: 1 },
          },
        },
        {
          $match: {
            count: 1,
          },
        },
        {
          $count: 'bounced',
        },
      ]).then(result => result[0]?.bounced || 0),
    ]);

    return totalSessions > 0
      ? ((bouncedSessions / totalSessions) * 100).toFixed(2)
      : 0;
  }

  /**
   * Get campaign performance
   */
  async getCampaignPerformance(startDate, endDate) {
    const campaigns = await AnalyticsEvent.aggregate([
      {
        $match: {
          'properties.campaign._id': { $exists: true },
          timestamp: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$properties.campaign._id',
          campaign: { $first: '$properties.campaign' },
          impressions: {
            $sum: {
              $cond: [{ $eq: ['$eventType', 'campaign_view'] }, 1, 0],
            },
          },
          clicks: {
            $sum: {
              $cond: [{ $eq: ['$eventType', 'campaign_click'] }, 1, 0],
            },
          },
          conversions: {
            $sum: {
              $cond: [{ $eq: ['$eventType', 'campaign_conversion'] }, 1, 0],
            },
          },
        },
      },
      {
        $addFields: {
          ctr: {
            $cond: [
              { $gt: ['$impressions', 0] },
              { $multiply: [{ $divide: ['$clicks', '$impressions'] }, 100] },
              0,
            ],
          },
          conversionRate: {
            $cond: [
              { $gt: ['$clicks', 0] },
              { $multiply: [{ $divide: ['$conversions', '$clicks'] }, 100] },
              0,
            ],
          },
        },
      },
      {
        $sort: { impressions: -1 },
      },
    ]);

    return campaigns;
  }
}

// Create singleton instance
const analyticsService = new AnalyticsService();

export default analyticsService;
