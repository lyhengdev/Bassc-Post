import aiService from '../services/aiService.js';
import { Article } from '../models/index.js';
import {
  successResponse,
  badRequestResponse,
  notFoundResponse,
} from '../utils/apiResponse.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * Grammar check
 * POST /api/ai/grammar-check
 */
export const grammarCheck = asyncHandler(async (req, res) => {
  const { text } = req.body;

  if (!text || text.trim().length === 0) {
    return badRequestResponse(res, 'Text is required');
  }

  if (text.length > 10000) {
    return badRequestResponse(res, 'Text exceeds maximum length of 10000 characters');
  }

  const result = await aiService.grammarCheck(text, req.user._id);

  return successResponse(res, result);
});

/**
 * Generate headlines
 * POST /api/ai/headline-generator
 */
export const generateHeadlines = asyncHandler(async (req, res) => {
  const { content, count, style } = req.body;

  if (!content || content.trim().length === 0) {
    return badRequestResponse(res, 'Content is required');
  }

  if (content.length < 50) {
    return badRequestResponse(res, 'Content must be at least 50 characters');
  }

  const result = await aiService.generateHeadlines(
    content,
    { count: count || 5, style: style || 'news' },
    req.user._id
  );

  return successResponse(res, result);
});

/**
 * Generate summary
 * POST /api/ai/summary
 */
export const generateSummary = asyncHandler(async (req, res) => {
  const { content, length, articleId } = req.body;

  let textToSummarize = content;

  // If articleId provided, get content from article
  if (articleId && !content) {
    const article = await Article.findById(articleId);
    if (!article) {
      return notFoundResponse(res, 'Article not found');
    }
    textToSummarize = article.getPlainText();
  }

  if (!textToSummarize || textToSummarize.trim().length === 0) {
    return badRequestResponse(res, 'Content or articleId is required');
  }

  if (textToSummarize.length < 100) {
    return badRequestResponse(res, 'Content must be at least 100 characters');
  }

  const result = await aiService.generateSummary(
    textToSummarize,
    { length: length || 'medium' },
    req.user._id
  );

  return successResponse(res, result);
});

/**
 * Sentiment analysis
 * POST /api/ai/sentiment-analysis
 */
export const sentimentAnalysis = asyncHandler(async (req, res) => {
  const { content, articleId } = req.body;

  let textToAnalyze = content;

  if (articleId && !content) {
    const article = await Article.findById(articleId);
    if (!article) {
      return notFoundResponse(res, 'Article not found');
    }
    textToAnalyze = article.getPlainText();
  }

  if (!textToAnalyze || textToAnalyze.trim().length === 0) {
    return badRequestResponse(res, 'Content or articleId is required');
  }

  const result = await aiService.analyzeSentiment(textToAnalyze, req.user._id);

  return successResponse(res, result);
});

/**
 * Improve writing
 * POST /api/ai/improve-writing
 */
export const improveWriting = asyncHandler(async (req, res) => {
  const { content, style, focus } = req.body;

  if (!content || content.trim().length === 0) {
    return badRequestResponse(res, 'Content is required');
  }

  if (content.length > 5000) {
    return badRequestResponse(res, 'Content exceeds maximum length of 5000 characters');
  }

  const result = await aiService.improveWriting(
    content,
    { style: style || 'professional', focus: focus || 'clarity' },
    req.user._id
  );

  return successResponse(res, result);
});

export default {
  grammarCheck,
  generateHeadlines,
  generateSummary,
  sentimentAnalysis,
  improveWriting,
};
