import articleSearchService from '../services/articleSearchService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

/**
 * Search Controller
 * 
 * Handles all search-related operations using Elasticsearch
 */

/**
 * Advanced search
 * GET /api/search
 */
export const search = asyncHandler(async (req, res) => {
  const {
    q,
    page = 1,
    limit = 20,
    category,
    author,
    tags,
    dateFrom,
    dateTo,
    isFeatured,
    isBreaking,
    sortBy = 'relevance',
    language = 'en',
  } = req.query;

  // Parse tags if provided
  const parsedTags = tags ? tags.split(',').map(t => t.trim()) : [];

  // Build filters
  const filters = {};
  if (category) filters.category = category;
  if (author) filters.author = author;
  if (parsedTags.length > 0) filters.tags = parsedTags;
  if (dateFrom) filters.dateFrom = dateFrom;
  if (dateTo) filters.dateTo = dateTo;
  if (isFeatured === 'true') filters.isFeatured = true;
  if (isBreaking === 'true') filters.isBreaking = true;

  try {
    const results = await articleSearchService.search({
      query: q || '',
      page: parseInt(page),
      limit: parseInt(limit),
      filters,
      sortBy,
      language,
    });

    return successResponse(res, {
      query: q,
      results: results.hits,
      total: results.total,
      page: results.page,
      limit: results.limit,
      pages: results.pages,
      facets: {
        categories: results.aggregations?.categories?.buckets || [],
        authors: results.aggregations?.authors?.buckets || [],
        tags: results.aggregations?.tags?.buckets || [],
        dateHistogram: results.aggregations?.date_histogram?.buckets || [],
      },
      suggestions: results.suggestions.map(s => s.text),
    });
  } catch (error) {
    console.error('Search error:', error);
    return errorResponse(res, 'Search failed', 500);
  }
});

/**
 * Autocomplete search
 * GET /api/search/autocomplete
 */
export const autocomplete = asyncHandler(async (req, res) => {
  const { q, limit = 10 } = req.query;

  if (!q || q.length < 2) {
    return successResponse(res, { suggestions: [] });
  }

  try {
    const suggestions = await articleSearchService.autocomplete(q, parseInt(limit));

    return successResponse(res, { suggestions });
  } catch (error) {
    console.error('Autocomplete error:', error);
    return errorResponse(res, 'Autocomplete failed', 500);
  }
});

/**
 * Get similar articles
 * GET /api/search/similar/:articleId
 */
export const getSimilar = asyncHandler(async (req, res) => {
  const { articleId } = req.params;
  const { limit = 5 } = req.query;

  try {
    const similar = await articleSearchService.getSimilar(articleId, parseInt(limit));

    return successResponse(res, { articles: similar });
  } catch (error) {
    console.error('Get similar error:', error);
    return errorResponse(res, 'Failed to get similar articles', 500);
  }
});

/**
 * Get trending articles
 * GET /api/search/trending
 */
export const getTrending = asyncHandler(async (req, res) => {
  const { limit = 10, hours = 24 } = req.query;

  try {
    const trending = await articleSearchService.getTrending(
      parseInt(limit),
      parseInt(hours)
    );

    return successResponse(res, { articles: trending });
  } catch (error) {
    console.error('Get trending error:', error);
    return errorResponse(res, 'Failed to get trending articles', 500);
  }
});

/**
 * Reindex all articles (admin only)
 * POST /api/search/reindex
 */
export const reindex = asyncHandler(async (req, res) => {
  try {
    const Article = (await import('../models/Article.js')).default;
    await articleSearchService.reindexAll(Article);

    return successResponse(res, { message: 'Reindex completed successfully' });
  } catch (error) {
    console.error('Reindex error:', error);
    return errorResponse(res, 'Reindex failed', 500);
  }
});

/**
 * Get search statistics (admin only)
 * GET /api/search/stats
 */
export const getSearchStats = asyncHandler(async (req, res) => {
  try {
    const elasticsearchService = (await import('../services/elasticsearchService.js')).default;
    const client = elasticsearchService.getClient();

    const [indexStats, clusterHealth] = await Promise.all([
      client.indices.stats({ index: 'articles' }),
      client.cluster.health({}),
    ]);

    const articlesIndex = indexStats.indices.articles;

    return successResponse(res, {
      cluster: {
        status: clusterHealth.status,
        nodes: clusterHealth.number_of_nodes,
        activeShards: clusterHealth.active_shards,
      },
      index: {
        documents: articlesIndex?.total?.docs?.count || 0,
        size: articlesIndex?.total?.store?.size_in_bytes || 0,
        sizeReadable: articlesIndex?.total?.store?.size || '0b',
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return errorResponse(res, 'Failed to get search stats', 500);
  }
});

export default {
  search,
  autocomplete,
  getSimilar,
  getTrending,
  reindex,
  getSearchStats,
};
