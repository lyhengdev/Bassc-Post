import ArticleTranslation from '../models/ArticleTranslation.js';
import CategoryTranslation from '../models/CategoryTranslation.js';
import Article from '../models/Article.js';
import Category from '../models/Category.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { successResponse, errorResponse, createdResponse } from '../utils/apiResponse.js';
import slugify from 'slugify';

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

  // Check if article exists
  const article = await Article.findById(articleId);
  if (!article) {
    return errorResponse(res, 'Article not found', 404);
  }

  // Check if translation already exists
  const existing = await ArticleTranslation.getByArticleAndLanguage(articleId, language);
  if (existing) {
    return errorResponse(res, 'Translation already exists for this language', 400);
  }

  // Generate slug if not provided
  const translationSlug = slug || slugify(title, {
    lower: true,
    strict: true,
    trim: true,
  }) + '-' + language;

  // Create translation
  const translation = await ArticleTranslation.create({
    articleId,
    language,
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
  });

  // Update article's available languages
  if (!article.availableLanguages.includes(language)) {
    article.availableLanguages.push(language);
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

  const translation = await ArticleTranslation.getByArticleAndLanguage(articleId, language);

  if (!translation) {
    return errorResponse(res, 'Translation not found', 404);
  }

  // Update fields
  if (title) translation.title = title;
  if (slug) translation.slug = slug;
  if (excerpt !== undefined) translation.excerpt = excerpt;
  if (content) translation.content = content;
  if (metaTitle !== undefined) translation.metaTitle = metaTitle;
  if (metaDescription !== undefined) translation.metaDescription = metaDescription;
  if (metaKeywords !== undefined) translation.metaKeywords = metaKeywords;
  if (translationStatus) translation.translationStatus = translationStatus;
  if (qualityScore !== undefined) translation.qualityScore = qualityScore;

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

  // Check if category exists
  const category = await Category.findById(categoryId);
  if (!category) {
    return errorResponse(res, 'Category not found', 404);
  }

  // Check if translation already exists
  const existing = await CategoryTranslation.getByCategoryAndLanguage(categoryId, language);
  if (existing) {
    return errorResponse(res, 'Translation already exists for this language', 400);
  }

  // Generate slug if not provided
  const translationSlug = slug || slugify(name, {
    lower: true,
    strict: true,
    trim: true,
  }) + '-' + language;

  // Create translation
  const translation = await CategoryTranslation.create({
    categoryId,
    language,
    name,
    slug: translationSlug,
    description: description || '',
    metaTitle,
    metaDescription,
    translatedBy: req.user._id,
    translationStatus: 'draft',
  });

  // Update category's available languages
  if (!category.availableLanguages.includes(language)) {
    category.availableLanguages.push(language);
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

  const translation = await CategoryTranslation.getByCategoryAndLanguage(categoryId, language);

  if (!translation) {
    return errorResponse(res, 'Translation not found', 404);
  }

  // Update fields
  if (name) translation.name = name;
  if (slug) translation.slug = slug;
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
