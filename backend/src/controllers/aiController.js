import aiService from '../services/aiService.js';
import { Article } from '../models/index.js';
import {
  successResponse,
  badRequestResponse,
  notFoundResponse,
} from '../utils/apiResponse.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { sanitizeEditorContent } from '../utils/helpers.js';

const getValueByPath = (obj, path) => path.reduce((current, key) => current?.[key], obj);

const setValueByPath = (obj, path, value) => {
  if (!obj || !Array.isArray(path) || path.length === 0) return;
  let current = obj;
  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index];
    if (current[key] === undefined || current[key] === null) return;
    current = current[key];
  }
  current[path[path.length - 1]] = value;
};

const collectListEntries = (items, basePath, entries) => {
  if (!Array.isArray(items)) return;
  items.forEach((item, index) => {
    const currentPath = [...basePath, index];
    if (typeof item === 'string' && item.trim()) {
      entries.push({ path: currentPath, text: item });
      return;
    }
    if (!item || typeof item !== 'object') return;
    if (typeof item.content === 'string' && item.content.trim()) {
      entries.push({ path: [...currentPath, 'content'], text: item.content });
    }
    if (typeof item.text === 'string' && item.text.trim()) {
      entries.push({ path: [...currentPath, 'text'], text: item.text });
    }
    if (Array.isArray(item.items)) {
      collectListEntries(item.items, [...currentPath, 'items'], entries);
    }
  });
};

const collectTranslatableEntries = (content) => {
  const entries = [];
  const blocks = Array.isArray(content?.blocks) ? content.blocks : [];

  blocks.forEach((block, blockIndex) => {
    if (!block || typeof block !== 'object') return;
    const basePath = ['blocks', blockIndex, 'data'];
    const data = block.data && typeof block.data === 'object' ? block.data : {};

    switch (block.type) {
      case 'paragraph':
      case 'header':
      case 'warning':
        if (typeof data.text === 'string' && data.text.trim()) {
          entries.push({ path: [...basePath, 'text'], text: data.text });
        }
        if (typeof data.title === 'string' && data.title.trim()) {
          entries.push({ path: [...basePath, 'title'], text: data.title });
        }
        break;
      case 'quote':
        if (typeof data.text === 'string' && data.text.trim()) {
          entries.push({ path: [...basePath, 'text'], text: data.text });
        }
        if (typeof data.caption === 'string' && data.caption.trim()) {
          entries.push({ path: [...basePath, 'caption'], text: data.caption });
        }
        break;
      case 'list':
        collectListEntries(data.items, [...basePath, 'items'], entries);
        break;
      case 'checklist':
        if (Array.isArray(data.items)) {
          data.items.forEach((item, itemIndex) => {
            if (typeof item?.text === 'string' && item.text.trim()) {
              entries.push({ path: [...basePath, 'items', itemIndex, 'text'], text: item.text });
            }
          });
        }
        break;
      case 'table':
        if (Array.isArray(data.content)) {
          data.content.forEach((row, rowIndex) => {
            if (!Array.isArray(row)) return;
            row.forEach((cell, cellIndex) => {
              if (typeof cell === 'string' && cell.trim()) {
                entries.push({ path: [...basePath, 'content', rowIndex, cellIndex], text: cell });
              }
            });
          });
        }
        break;
      case 'image':
      case 'embed':
        if (typeof data.caption === 'string' && data.caption.trim()) {
          entries.push({ path: [...basePath, 'caption'], text: data.caption });
        }
        break;
      case 'linkTool':
        if (typeof data?.meta?.title === 'string' && data.meta.title.trim()) {
          entries.push({ path: [...basePath, 'meta', 'title'], text: data.meta.title });
        }
        if (typeof data?.meta?.description === 'string' && data.meta.description.trim()) {
          entries.push({ path: [...basePath, 'meta', 'description'], text: data.meta.description });
        }
        break;
      default:
        break;
    }
  });

  return entries;
};

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

/**
 * Translate article fields and EditorJS content
 * POST /api/ai/translate-article
 */
export const translateArticle = asyncHandler(async (req, res) => {
  const {
    sourceLanguage = 'en',
    targetLanguage = 'km',
    title = '',
    excerpt = '',
    content,
  } = req.body;

  if (!content || !Array.isArray(content.blocks) || content.blocks.length === 0) {
    return badRequestResponse(res, 'Valid article content is required');
  }

  const normalizedSource = sanitizeEditorContent(content);
  const translatedContent = JSON.parse(JSON.stringify(normalizedSource));
  const blockEntries = collectTranslatableEntries(translatedContent);

  const queue = [];
  const pointers = [];

  if (typeof title === 'string' && title.trim()) {
    queue.push(title);
    pointers.push({ field: 'title' });
  }

  if (typeof excerpt === 'string' && excerpt.trim()) {
    queue.push(excerpt);
    pointers.push({ field: 'excerpt' });
  }

  blockEntries.forEach((entry) => {
    const sourceText = getValueByPath(translatedContent, entry.path);
    if (typeof sourceText === 'string' && sourceText.trim()) {
      queue.push(sourceText);
      pointers.push({ field: 'content', path: entry.path });
    }
  });

  if (queue.length === 0) {
    return successResponse(res, {
      sourceLanguage,
      targetLanguage,
      title,
      excerpt,
      content: normalizedSource,
      isMachineTranslated: true,
    });
  }

  const translationResult = await aiService.translateTexts(
    queue,
    { sourceLanguage, targetLanguage },
    req.user._id
  );

  const translatedQueue = Array.isArray(translationResult?.translations)
    ? translationResult.translations
    : queue;

  let translatedTitle = title;
  let translatedExcerpt = excerpt;

  pointers.forEach((pointer, index) => {
    const value = translatedQueue[index];
    if (typeof value !== 'string') return;

    if (pointer.field === 'title') {
      translatedTitle = value;
      return;
    }
    if (pointer.field === 'excerpt') {
      translatedExcerpt = value;
      return;
    }
    if (pointer.field === 'content' && pointer.path) {
      setValueByPath(translatedContent, pointer.path, value);
    }
  });

  return successResponse(res, {
    sourceLanguage,
    targetLanguage,
    title: translatedTitle,
    excerpt: translatedExcerpt,
    content: sanitizeEditorContent(translatedContent),
    isMachineTranslated: true,
  });
});

export default {
  grammarCheck,
  generateHeadlines,
  generateSummary,
  sentimentAnalysis,
  improveWriting,
  translateArticle,
};
