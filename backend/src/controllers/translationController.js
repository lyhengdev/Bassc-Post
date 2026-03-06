import ArticleTranslation from '../models/ArticleTranslation.js';
import CategoryTranslation from '../models/CategoryTranslation.js';
import Article from '../models/Article.js';
import Category from '../models/Category.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { successResponse, errorResponse, createdResponse, badRequestResponse, forbiddenResponse } from '../utils/apiResponse.js';
import slugify from 'slugify';

const mapTranslationStatusToWorkflowState = (translationStatus = '') => {
  switch (translationStatus) {
    case 'published':
      return 'approved';
    case 'review':
      return 'submitted';
    case 'in_progress':
      return 'in_progress';
    case 'draft':
    default:
      return 'draft';
  }
};

const WORKFLOW_SOURCE_STATES = Object.freeze({
  APPROVED: 'approved',
});

const WORKFLOW_TRANSLATION_STATES = Object.freeze({
  IN_TRANSLATION: 'in_translation',
  CHANGES_REQUESTED: 'changes_requested',
});
const WORKFLOW_TRANSLATION_CONTRIBUTOR_ROLES = Object.freeze(['translator', 'writer']);

const normalizeSlug = (value = '', fallback = 'translation') => {
  const normalized = slugify(String(value || ''), {
    lower: true,
    strict: true,
    trim: true,
  });
  return normalized || fallback;
};

const normalizeLanguage = (value = '') => String(value || '').trim().toLowerCase();

const buildUniqueSlug = async ({
  Model,
  language,
  baseValue,
  fallbackBase = 'translation',
  excludeId = null,
}) => {
  const baseSlug = normalizeSlug(baseValue, fallbackBase);
  let candidate = baseSlug;
  let counter = 1;

  while (counter <= 500) {
    const query = { language, slug: candidate };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const exists = await Model.exists(query);
    if (!exists) {
      return candidate;
    }
    counter += 1;
    candidate = `${baseSlug}-${counter}`;
  }

  return `${baseSlug}-${Date.now()}`;
};

const getArticleWorkflow = (article = {}) => {
  const workflow = article?.workflow || {};
  return {
    sourceReviewState: workflow.sourceReviewState || 'draft',
    translationState: workflow.translationState || 'not_required',
    assignedTranslator: workflow.assignedTranslator || null,
  };
};

const enforceTranslatorWorkflowAccess = (res, article, user) => {
  if (!WORKFLOW_TRANSLATION_CONTRIBUTOR_ROLES.includes(user?.role)) {
    return true;
  }

  const workflow = getArticleWorkflow(article);
  const assignedTranslatorId =
    workflow.assignedTranslator?._id?.toString?.() ||
    workflow.assignedTranslator?.toString?.() ||
    workflow.assignedTranslator;
  const currentUserId = user?._id?.toString?.() || user?._id;
  const articleAuthorId =
    article?.author?._id?.toString?.() ||
    article?.author?.toString?.() ||
    article?.author;

  if (user?.role === 'writer') {
    const isOwner = Boolean(articleAuthorId && currentUserId && articleAuthorId === currentUserId);
    const isAssignedWriter = Boolean(assignedTranslatorId && currentUserId && assignedTranslatorId === currentUserId);
    if (!isOwner && !isAssignedWriter) {
      forbiddenResponse(res, 'Writers can only translate their own articles');
      return false;
    }
  }

  if (workflow.sourceReviewState !== WORKFLOW_SOURCE_STATES.APPROVED) {
    badRequestResponse(res, 'Source must be approved before translation work can start');
    return false;
  }

  if (![WORKFLOW_TRANSLATION_STATES.IN_TRANSLATION, WORKFLOW_TRANSLATION_STATES.CHANGES_REQUESTED].includes(workflow.translationState)) {
    badRequestResponse(res, 'This article is not in an active translation stage');
    return false;
  }

  if (assignedTranslatorId && currentUserId && assignedTranslatorId !== currentUserId) {
    forbiddenResponse(res, 'This translation is assigned to another translator');
    return false;
  }

  return true;
};

// ==================== ARTICLE TRANSLATIONS ====================

/**
 * Get all translations for an article
 * GET /api/translations/articles/:articleId
 */
export const getArticleTranslations = asyncHandler(async (req, res) => {
  const { articleId } = req.params;

  const article = await Article.findById(articleId);
  if (!article) {
    return errorResponse(res, 'Article not found', 404);
  }

  const translations = await ArticleTranslation.getAllByArticle(articleId);

  return successResponse(res, {
    article: {
      _id: article._id,
      title: article.title,
      language: article.language,
    },
    translations,
  });
});

/**
 * Get article translation by language
 * GET /api/translations/articles/:articleId/:language
 */
export const getArticleTranslation = asyncHandler(async (req, res) => {
  const { articleId, language } = req.params;

  const translation = await ArticleTranslation.getByArticleAndLanguage(articleId, language);

  if (!translation) {
    return errorResponse(res, 'Translation not found', 404);
  }

  return successResponse(res, { translation });
});

/**
 * Create article translation
 * POST /api/translations/articles/:articleId
 */
export const createArticleTranslation = asyncHandler(async (req, res) => {
  const { articleId } = req.params;
  const {
    language,
    title,
    slug,
    excerpt,
    content,
    metaTitle,
    metaDescription,
    metaKeywords,
    isMachineTranslated,
  } = req.body;
  const normalizedLanguage = normalizeLanguage(language);
  if (!normalizedLanguage) {
    return badRequestResponse(res, 'Translation language is required');
  }

  // Check if article exists
  const article = await Article.findById(articleId);
  if (!article) {
    return errorResponse(res, 'Article not found', 404);
  }

  if (!enforceTranslatorWorkflowAccess(res, article, req.user)) {
    return;
  }

  // Check if translation already exists
  const existing = await ArticleTranslation.getByArticleAndLanguage(articleId, normalizedLanguage);
  if (existing) {
    return errorResponse(res, 'Translation already exists for this language', 400);
  }

  // Generate collision-safe slug (prevents duplicate-key errors across same language).
  const translationSlug = await buildUniqueSlug({
    Model: ArticleTranslation,
    language: normalizedLanguage,
    baseValue: slug || `${title}-${normalizedLanguage}`,
    fallbackBase: `article-${articleId}-${normalizedLanguage}`,
  });

  // Create translation
  const translation = await ArticleTranslation.create({
    articleId,
    language: normalizedLanguage,
    title,
    slug: translationSlug,
    excerpt: excerpt || '',
    content,
    metaTitle,
    metaDescription,
    metaKeywords,
    isMachineTranslated: isMachineTranslated || false,
    translatedBy: req.user._id,
    translationStatus: 'draft',
    workflow: {
      translationState: 'draft',
      timestamps: {
        submittedAt: null,
        reviewedAt: null,
      },
      reviewedBy: {
        submittedBy: req.user._id,
        reviewer: null,
      },
      reviewNotes: '',
    },
  });

  // Update article's available languages
  if (!article.availableLanguages.includes(normalizedLanguage)) {
    article.availableLanguages.push(normalizedLanguage);
    await article.save();
  }

  return createdResponse(res, { translation }, 'Translation created successfully');
});

/**
 * Update article translation
 * PUT /api/translations/articles/:articleId/:language
 */
export const updateArticleTranslation = asyncHandler(async (req, res) => {
  const { articleId, language } = req.params;
  const {
    title,
    slug,
    excerpt,
    content,
    metaTitle,
    metaDescription,
    metaKeywords,
    translationStatus,
    qualityScore,
  } = req.body;
  const normalizedLanguage = normalizeLanguage(language);
  if (!normalizedLanguage) {
    return badRequestResponse(res, 'Translation language is required');
  }

  const translation = await ArticleTranslation.getByArticleAndLanguage(articleId, normalizedLanguage);

  if (!translation) {
    return errorResponse(res, 'Translation not found', 404);
  }

  const article = await Article.findById(articleId);
  if (!article) {
    return errorResponse(res, 'Article not found', 404);
  }

  if (!enforceTranslatorWorkflowAccess(res, article, req.user)) {
    return;
  }

  // Update fields
  if (title) translation.title = title;
  if (slug) {
    translation.slug = await buildUniqueSlug({
      Model: ArticleTranslation,
      language: normalizedLanguage,
      baseValue: slug,
      fallbackBase: `${translation.title || title || normalizedLanguage}-${normalizedLanguage}`,
      excludeId: translation._id,
    });
  }
  if (excerpt !== undefined) translation.excerpt = excerpt;
  if (content) translation.content = content;
  if (metaTitle !== undefined) translation.metaTitle = metaTitle;
  if (metaDescription !== undefined) translation.metaDescription = metaDescription;
  if (metaKeywords !== undefined) translation.metaKeywords = metaKeywords;
  if (translationStatus) translation.translationStatus = translationStatus;
  if (qualityScore !== undefined) translation.qualityScore = qualityScore;

  if (translationStatus) {
    const workflowState = mapTranslationStatusToWorkflowState(translationStatus);
    if (!translation.workflow) translation.workflow = {};
    if (!translation.workflow.timestamps) translation.workflow.timestamps = {};
    if (!translation.workflow.reviewedBy) translation.workflow.reviewedBy = {};

    translation.workflow.translationState = workflowState;
    if (workflowState === 'submitted' || workflowState === 'approved') {
      translation.workflow.timestamps.submittedAt =
        translation.workflow.timestamps.submittedAt || new Date();
    }
    if (workflowState === 'approved') {
      translation.workflow.timestamps.reviewedAt = new Date();
      translation.workflow.reviewedBy.reviewer = req.user._id;
    }
  }

  await translation.save();

  return successResponse(res, { translation }, 'Translation updated successfully');
});

/**
 * Delete article translation
 * DELETE /api/translations/articles/:articleId/:language
 */
export const deleteArticleTranslation = asyncHandler(async (req, res) => {
  const { articleId, language } = req.params;

  const translation = await ArticleTranslation.findOneAndDelete({ articleId, language });

  if (!translation) {
    return errorResponse(res, 'Translation not found', 404);
  }

  // Update article's available languages
  const article = await Article.findById(articleId);
  if (article) {
    article.availableLanguages = article.availableLanguages.filter(lang => lang !== language);
    await article.save();
  }

  return successResponse(res, { message: 'Translation deleted successfully' });
});

/**
 * Publish article translation
 * POST /api/translations/articles/:articleId/:language/publish
 */
export const publishArticleTranslation = asyncHandler(async (req, res) => {
  const { articleId, language } = req.params;

  const translation = await ArticleTranslation.getByArticleAndLanguage(articleId, language);

  if (!translation) {
    return errorResponse(res, 'Translation not found', 404);
  }

  await translation.markAsReviewed(req.user._id);

  return successResponse(res, { translation }, 'Translation published successfully');
});

// ==================== CATEGORY TRANSLATIONS ====================

/**
 * Get all translations for a category
 * GET /api/translations/categories/:categoryId
 */
export const getCategoryTranslations = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;

  const category = await Category.findById(categoryId);
  if (!category) {
    return errorResponse(res, 'Category not found', 404);
  }

  const translations = await CategoryTranslation.getAllByCategory(categoryId);

  return successResponse(res, {
    category: {
      _id: category._id,
      name: category.name,
      language: category.language,
    },
    translations,
  });
});

/**
 * Get category translation by language
 * GET /api/translations/categories/:categoryId/:language
 */
export const getCategoryTranslation = asyncHandler(async (req, res) => {
  const { categoryId, language } = req.params;

  const translation = await CategoryTranslation.getByCategoryAndLanguage(categoryId, language);

  if (!translation) {
    return errorResponse(res, 'Translation not found', 404);
  }

  return successResponse(res, { translation });
});

/**
 * Create category translation
 * POST /api/translations/categories/:categoryId
 */
export const createCategoryTranslation = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const {
    language,
    name,
    slug,
    description,
    metaTitle,
    metaDescription,
  } = req.body;
  const normalizedLanguage = normalizeLanguage(language);
  if (!normalizedLanguage) {
    return badRequestResponse(res, 'Translation language is required');
  }

  // Check if category exists
  const category = await Category.findById(categoryId);
  if (!category) {
    return errorResponse(res, 'Category not found', 404);
  }

  // Check if translation already exists
  const existing = await CategoryTranslation.getByCategoryAndLanguage(categoryId, normalizedLanguage);
  if (existing) {
    return errorResponse(res, 'Translation already exists for this language', 400);
  }

  const translationSlug = await buildUniqueSlug({
    Model: CategoryTranslation,
    language: normalizedLanguage,
    baseValue: slug || `${name}-${normalizedLanguage}`,
    fallbackBase: `category-${categoryId}-${normalizedLanguage}`,
  });

  // Create translation
  const translation = await CategoryTranslation.create({
    categoryId,
    language: normalizedLanguage,
    name,
    slug: translationSlug,
    description: description || '',
    metaTitle,
    metaDescription,
    translatedBy: req.user._id,
    translationStatus: 'draft',
  });

  // Update category's available languages
  if (!category.availableLanguages.includes(normalizedLanguage)) {
    category.availableLanguages.push(normalizedLanguage);
    await category.save();
  }

  return createdResponse(res, { translation }, 'Translation created successfully');
});

/**
 * Update category translation
 * PUT /api/translations/categories/:categoryId/:language
 */
export const updateCategoryTranslation = asyncHandler(async (req, res) => {
  const { categoryId, language } = req.params;
  const {
    name,
    slug,
    description,
    metaTitle,
    metaDescription,
    translationStatus,
  } = req.body;
  const normalizedLanguage = normalizeLanguage(language);
  if (!normalizedLanguage) {
    return badRequestResponse(res, 'Translation language is required');
  }

  const translation = await CategoryTranslation.getByCategoryAndLanguage(categoryId, normalizedLanguage);

  if (!translation) {
    return errorResponse(res, 'Translation not found', 404);
  }

  // Update fields
  if (name) translation.name = name;
  if (slug) {
    translation.slug = await buildUniqueSlug({
      Model: CategoryTranslation,
      language: normalizedLanguage,
      baseValue: slug,
      fallbackBase: `${translation.name || name || normalizedLanguage}-${normalizedLanguage}`,
      excludeId: translation._id,
    });
  }
  if (description !== undefined) translation.description = description;
  if (metaTitle !== undefined) translation.metaTitle = metaTitle;
  if (metaDescription !== undefined) translation.metaDescription = metaDescription;
  if (translationStatus) translation.translationStatus = translationStatus;

  await translation.save();

  return successResponse(res, { translation }, 'Translation updated successfully');
});

/**
 * Delete category translation
 * DELETE /api/translations/categories/:categoryId/:language
 */
export const deleteCategoryTranslation = asyncHandler(async (req, res) => {
  const { categoryId, language } = req.params;

  const translation = await CategoryTranslation.findOneAndDelete({ categoryId, language });

  if (!translation) {
    return errorResponse(res, 'Translation not found', 404);
  }

  // Update category's available languages
  const category = await Category.findById(categoryId);
  if (category) {
    category.availableLanguages = category.availableLanguages.filter(lang => lang !== language);
    await category.save();
  }

  return successResponse(res, { message: 'Translation deleted successfully' });
});

/**
 * Publish category translation
 * POST /api/translations/categories/:categoryId/:language/publish
 */
export const publishCategoryTranslation = asyncHandler(async (req, res) => {
  const { categoryId, language } = req.params;

  const translation = await CategoryTranslation.getByCategoryAndLanguage(categoryId, language);

  if (!translation) {
    return errorResponse(res, 'Translation not found', 404);
  }

  translation.translationStatus = 'published';
  await translation.save();

  return successResponse(res, { translation }, 'Translation published successfully');
});

// ==================== LANGUAGE INFO ====================

/**
 * Get supported languages
 * GET /api/translations/languages
 */
export const getSupportedLanguages = asyncHandler(async (req, res) => {
  const languages = [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
    { code: 'km', name: 'Khmer', nativeName: 'ខ្មែរ', flag: '🇰🇭' },
    { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
    { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
    { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭' },
    { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
    { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
    { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', rtl: true },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  ];

  return successResponse(res, { languages });
});

export default {
  // Article translations
  getArticleTranslations,
  getArticleTranslation,
  createArticleTranslation,
  updateArticleTranslation,
  deleteArticleTranslation,
  publishArticleTranslation,

  // Category translations
  getCategoryTranslations,
  getCategoryTranslation,
  createCategoryTranslation,
  updateCategoryTranslation,
  deleteCategoryTranslation,
  publishCategoryTranslation,

  // Languages
  getSupportedLanguages,
};
