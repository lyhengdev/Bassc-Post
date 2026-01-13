import { Article, User, Category } from '../models/index.js';
import { PageView, SiteAnalytics, AILog, analyticsHelpers } from '../models/Analytics.js';
import {
  successResponse,
} from '../utils/apiResponse.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * Get dashboard summary
 * GET /api/dashboard/summary
 */
export const getDashboardSummary = asyncHandler(async (req, res) => {
  const user = req.user;
  let data = {};

  // Different dashboards based on role
  if (user.role === 'admin') {
    const [
      totalArticles,
      publishedArticles,
      pendingArticles,
      totalUsers,
      totalCategories,
      totalViews,
      recentArticles,
      topArticles,
    ] = await Promise.all([
      Article.countDocuments(),
      Article.countDocuments({ status: 'published' }),
      Article.countDocuments({ status: 'pending' }),
      User.countDocuments(),
      Category.countDocuments({ isActive: true }),
      Article.aggregate([{ $group: { _id: null, total: { $sum: '$viewCount' } } }]),
      Article.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('author', 'firstName lastName')
        .select('title status createdAt'),
      Article.find({ status: 'published' })
        .sort({ viewCount: -1 })
        .limit(5)
        .select('title viewCount'),
    ]);

    data = {
      stats: {
        totalArticles,
        publishedArticles,
        pendingArticles,
        totalUsers,
        totalCategories,
        totalViews: totalViews[0]?.total || 0,
      },
      recentArticles,
      topArticles,
    };
  } else if (user.role === 'editor') {
    const [
      pendingArticles,
      reviewedToday,
      recentPending,
    ] = await Promise.all([
      Article.countDocuments({ status: 'pending' }),
      Article.countDocuments({
        reviewedBy: user._id,
        reviewedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),
      Article.find({ status: 'pending' })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('author', 'firstName lastName')
        .select('title createdAt'),
    ]);

    data = {
      stats: {
        pendingArticles,
        reviewedToday,
      },
      recentPending,
    };
  } else if (user.role === 'writer') {
    const [
      totalArticles,
      publishedArticles,
      draftArticles,
      pendingArticles,
      rejectedArticles,
      totalViews,
      recentArticles,
    ] = await Promise.all([
      Article.countDocuments({ author: user._id }),
      Article.countDocuments({ author: user._id, status: 'published' }),
      Article.countDocuments({ author: user._id, status: 'draft' }),
      Article.countDocuments({ author: user._id, status: 'pending' }),
      Article.countDocuments({ author: user._id, status: 'rejected' }),
      Article.aggregate([
        { $match: { author: user._id } },
        { $group: { _id: null, total: { $sum: '$viewCount' } } },
      ]),
      Article.find({ author: user._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title status createdAt viewCount'),
    ]);

    data = {
      stats: {
        totalArticles,
        publishedArticles,
        draftArticles,
        pendingArticles,
        rejectedArticles,
        totalViews: totalViews[0]?.total || 0,
      },
      recentArticles,
    };
  } else {
    data = {
      stats: {},
    };
  }

  return successResponse(res, data);
});

/**
 * Get views analytics (admin)
 * GET /api/analytics/views
 */
export const getViewsAnalytics = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days, 10) || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const dailyViews = await PageView.aggregate([
    { $match: { date: { $gte: startDate } } },
    {
      $group: {
        _id: '$date',
        views: { $sum: '$views' },
        uniqueVisitors: { $sum: '$uniqueVisitors' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const totalViews = dailyViews.reduce((acc, day) => acc + day.views, 0);
  const totalUnique = dailyViews.reduce((acc, day) => acc + day.uniqueVisitors, 0);

  return successResponse(res, {
    period: `Last ${days} days`,
    totalViews,
    totalUniqueVisitors: totalUnique,
    averageDaily: Math.round(totalViews / days),
    dailyData: dailyViews.map((day) => ({
      date: day._id,
      views: day.views,
      uniqueVisitors: day.uniqueVisitors,
    })),
  });
});

/**
 * Get articles analytics (admin)
 * GET /api/analytics/articles
 */
export const getArticlesAnalytics = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days, 10) || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [
    statusBreakdown,
    categoryBreakdown,
    publishedOverTime,
    topArticles,
    topAuthors,
  ] = await Promise.all([
    Article.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Article.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: '$category', count: { $sum: 1 }, views: { $sum: '$viewCount' } } },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: '$category' },
      { $project: { name: '$category.name', count: 1, views: 1 } },
      { $sort: { count: -1 } },
    ]),
    Article.aggregate([
      {
        $match: {
          status: 'published',
          publishedAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$publishedAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Article.find({ status: 'published' })
      .sort({ viewCount: -1 })
      .limit(10)
      .select('title viewCount publishedAt')
      .populate('author', 'firstName lastName'),
    Article.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: '$author', count: { $sum: 1 }, views: { $sum: '$viewCount' } } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'author',
        },
      },
      { $unwind: '$author' },
      {
        $project: {
          name: { $concat: ['$author.firstName', ' ', '$author.lastName'] },
          count: 1,
          views: 1,
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);

  return successResponse(res, {
    statusBreakdown: Object.fromEntries(statusBreakdown.map((s) => [s._id, s.count])),
    categoryBreakdown,
    publishedOverTime,
    topArticles,
    topAuthors,
  });
});

/**
 * Get users analytics (admin)
 * GET /api/analytics/users
 */
export const getUsersAnalytics = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days, 10) || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [
    roleBreakdown,
    statusBreakdown,
    newUsersOverTime,
    activeWriters,
  ] = await Promise.all([
    User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]),
    User.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Article.aggregate([
      {
        $match: {
          status: 'published',
          publishedAt: { $gte: startDate },
        },
      },
      { $group: { _id: '$author', articles: { $sum: 1 } } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'author',
        },
      },
      { $unwind: '$author' },
      {
        $project: {
          name: { $concat: ['$author.firstName', ' ', '$author.lastName'] },
          articles: 1,
        },
      },
      { $sort: { articles: -1 } },
      { $limit: 10 },
    ]),
  ]);

  return successResponse(res, {
    roleBreakdown: Object.fromEntries(roleBreakdown.map((r) => [r._id, r.count])),
    statusBreakdown: Object.fromEntries(statusBreakdown.map((s) => [s._id, s.count])),
    newUsersOverTime,
    activeWriters,
  });
});

/**
 * Get AI usage analytics (admin)
 * GET /api/analytics/ai
 */
export const getAIAnalytics = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days, 10) || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [
    actionBreakdown,
    usageOverTime,
    tokenUsage,
    topUsers,
  ] = await Promise.all([
    AILog.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$action', count: { $sum: 1 } } },
    ]),
    AILog.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          tokens: { $sum: '$totalTokens' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    AILog.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: null,
          totalTokens: { $sum: '$totalTokens' },
          inputTokens: { $sum: '$inputTokens' },
          outputTokens: { $sum: '$outputTokens' },
        },
      },
    ]),
    AILog.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$user', count: { $sum: 1 }, tokens: { $sum: '$totalTokens' } } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          name: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
          count: 1,
          tokens: 1,
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);

  return successResponse(res, {
    actionBreakdown: Object.fromEntries(actionBreakdown.map((a) => [a._id, a.count])),
    usageOverTime,
    tokenUsage: tokenUsage[0] || { totalTokens: 0, inputTokens: 0, outputTokens: 0 },
    topUsers,
  });
});

export default {
  getDashboardSummary,
  getViewsAnalytics,
  getArticlesAnalytics,
  getUsersAnalytics,
  getAIAnalytics,
};
