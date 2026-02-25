import {Article, ArticleTranslation, Category, Media, User} from '../models/index.js';
import {analyticsHelpers, PageView} from '../models/Analytics.js';
import {sanitizeEditorContent, parsePaginationParams, generateHash, getClientIp} from '../utils/helpers.js';
import emailService from '../services/emailService.js';
import cacheService from '../services/cacheService.js';
import config from '../config/index.js';
import {
    successResponse,
    createdResponse,
    paginatedResponse,
    notFoundResponse,
    forbiddenResponse,
    badRequestResponse,
} from '../utils/apiResponse.js';
import {asyncHandler} from '../middleware/errorHandler.js';

const syncFeaturedImageUsage = async (articleId, newUrl, oldUrl = null) => {
    if (oldUrl && oldUrl !== newUrl) {
        const oldMedia = await Media.findOne({url: oldUrl});
        if (oldMedia) {
            await oldMedia.removeUsage('Article', articleId);
        }
    }

    if (newUrl && newUrl !== oldUrl) {
        const newMedia = await Media.findOne({url: newUrl});
        if (newMedia) {
            await newMedia.trackUsage('Article', articleId);
        }
    }
};

const normalizeArticleLanguage = (value = '') => {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return '';
    if (raw.startsWith('zh')) return 'zh';
    if (raw.startsWith('km')) return 'km';
    if (raw.startsWith('en')) return 'en';
    return raw.split(/[-_]/)[0] || '';
};

const normalizePostType = (value = 'news') => {
    const raw = String(value || '').trim().toLowerCase();
    return raw === 'video' ? 'video' : 'news';
};

const normalizeVideoUrl = (value = '') => String(value || '').trim();

const buildVideoFallbackContent = ({ title = '', excerpt = '', videoUrl = '' } = {}) => {
    const summary = excerpt || title || 'Video post';
    return {
        time: Date.now(),
        blocks: [
            {
                id: `video-summary-${Date.now().toString(36)}`,
                type: 'paragraph',
                data: { text: summary },
            },
            {
                id: `video-link-${Date.now().toString(36)}`,
                type: 'paragraph',
                data: { text: videoUrl ? `<a href="${videoUrl}" target="_blank" rel="noopener noreferrer">${videoUrl}</a>` : '' },
            },
        ],
        version: '2.28.2',
    };
};

const toPlainArticle = (article) => {
    if (!article) return null;
    if (typeof article.toObject === 'function') {
        return article.toObject();
    }
    return article;
};

const normalizeLanguageList = (languages = [], fallback = '') => {
    const set = new Set();
    const normalizedFallback = normalizeArticleLanguage(fallback);
    if (normalizedFallback) {
        set.add(normalizedFallback);
    }
    if (Array.isArray(languages)) {
        for (const value of languages) {
            const normalized = normalizeArticleLanguage(value);
            if (normalized) {
                set.add(normalized);
            }
        }
    }
    return Array.from(set);
};

const applyPreferredLanguageToArticles = async (articles, requestedLanguageInput = '') => {
    if (!Array.isArray(articles) || articles.length === 0) {
        return [];
    }

    const requestedLanguage = normalizeArticleLanguage(requestedLanguageInput);
    const normalizedArticles = articles
        .map((item) => toPlainArticle(item))
        .filter(Boolean);

    if (normalizedArticles.length === 0) {
        return [];
    }

    const articleIds = normalizedArticles
        .map((item) => item?._id)
        .filter(Boolean);

    const translationByArticleId = new Map();
    if (requestedLanguage && articleIds.length > 0) {
        const translations = await ArticleTranslation.find({
            articleId: {$in: articleIds},
            language: requestedLanguage,
        })
            .select('articleId language slug title excerpt metaTitle metaDescription metaKeywords translationStatus updatedAt createdAt')
            .sort({updatedAt: -1, createdAt: -1})
            .lean();

        const statusScore = {
            published: 4,
            review: 3,
            in_progress: 2,
            draft: 1,
        };

        for (const translation of translations) {
            const key = String(translation.articleId);
            const existing = translationByArticleId.get(key);
            if (!existing) {
                translationByArticleId.set(key, translation);
                continue;
            }

            const existingScore = statusScore[existing.translationStatus] || 0;
            const nextScore = statusScore[translation.translationStatus] || 0;
            if (nextScore > existingScore) {
                translationByArticleId.set(key, translation);
            }
        }
    }

    return normalizedArticles.map((article) => {
        const baseLanguage = normalizeArticleLanguage(article.language) || 'en';
        const translation = requestedLanguage ? translationByArticleId.get(String(article._id)) : null;
        const availableLanguages = normalizeLanguageList(
            translation ? [...(article.availableLanguages || []), requestedLanguage] : article.availableLanguages,
            baseLanguage
        );

        if (!translation || requestedLanguage === baseLanguage) {
            return {
                ...article,
                language: baseLanguage,
                availableLanguages,
                originalSlug: article.slug,
                originalLanguage: baseLanguage,
                isTranslation: false,
            };
        }

        return {
            ...article,
            title: translation.title || article.title,
            slug: translation.slug || article.slug,
            excerpt: translation.excerpt ?? article.excerpt,
            metaTitle: translation.metaTitle || article.metaTitle,
            metaDescription: translation.metaDescription || article.metaDescription,
            metaKeywords: Array.isArray(translation.metaKeywords) && translation.metaKeywords.length > 0
                ? translation.metaKeywords
                : article.metaKeywords,
            language: requestedLanguage,
            availableLanguages,
            originalSlug: article.slug,
            originalLanguage: baseLanguage,
            isTranslation: true,
        };
    });
};

/**
 * Create article
 * POST /api/articles
 */
export const createArticle = asyncHandler(async (req, res) => {
    const {
        title,
        content,
        excerpt,
        category,
        tags,
        metaTitle,
        metaDescription,
        featuredImage,
        status,
        isFeatured,
        isBreaking,
        postType,
        videoUrl,
    } = req.body;
    const normalizedPostType = normalizePostType(postType);
    const normalizedVideoUrl = normalizedPostType === 'video' ? normalizeVideoUrl(videoUrl) : '';

    if (normalizedPostType === 'video' && !normalizedVideoUrl) {
        return badRequestResponse(res, 'Video URL is required for video posts');
    }

    // Verify category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
        return badRequestResponse(res, 'Category not found');
    }

    // Sanitize content
    let sanitizedContent = sanitizeEditorContent(content);
    const hasBlocks = Array.isArray(sanitizedContent?.blocks) && sanitizedContent.blocks.length > 0;
    if (!hasBlocks && normalizedPostType === 'video') {
        sanitizedContent = sanitizeEditorContent(
            buildVideoFallbackContent({ title, excerpt, videoUrl: normalizedVideoUrl })
        );
    }
    if (!Array.isArray(sanitizedContent?.blocks) || sanitizedContent.blocks.length === 0) {
        return badRequestResponse(res, 'Article content is required');
    }

    // Determine article status - default to draft, respect user input
    let articleStatus = status || 'draft';
    let publishedAt = null;
    
    // Only admin can directly publish, others can submit for review (pending)
    if (articleStatus === 'published') {
        if (!['admin', 'editor'].includes(req.user.role)) {
            articleStatus = 'pending'; // Non-admin/editor submissions go to pending
        } else {
            publishedAt = new Date();
        }
    }

    const article = await Article.create({
        title,
        content: sanitizedContent,
        excerpt,
        category,
        tags: tags || [],
        metaTitle,
        metaDescription,
        featuredImage,
        postType: normalizedPostType,
        videoUrl: normalizedVideoUrl,
        author: req.user._id,
        status: articleStatus,
        publishedAt,
        isFeatured: isFeatured || false,
        isBreaking: isBreaking || false,
    });

    await article.populate('author', 'firstName lastName avatar');
    await article.populate('category', 'name slug color');
    await syncFeaturedImageUsage(article._id, featuredImage);

    // Invalidate article list caches
    await cacheService.invalidateArticleLists();

    if (articleStatus === 'pending') {
        try {
            const reviewers = await User.find({ role: { $in: ['admin', 'editor'] } }).select('_id');
            const reviewerIds = reviewers
                .map((u) => u._id)
                .filter((id) => id.toString() !== article.author._id.toString());
            if (reviewerIds.length) {
                const { default: notificationService } = await import('../services/notificationService.js');
                await notificationService.notifyArticleSubmitted(article, reviewerIds);
            }
        } catch (error) {
            console.error('Failed to send submission notification:', error);
        }
    }

    const message = articleStatus === 'published' 
        ? 'Article published successfully' 
        : articleStatus === 'pending' 
            ? 'Article submitted for review'
            : 'Article saved as draft';

    return createdResponse(res, {article}, message);
});

/**
 * Get all published articles (public) - WITH CACHING
 * GET /api/articles
 */
export const getArticles = asyncHandler(async (req, res) => {
    const {page, limit, skip} = parsePaginationParams(req.query);
    const {category, tag, sortBy = 'publishedAt', sortOrder = 'desc', isBreaking, isFeatured, postType} = req.query;
    const requestedLanguage = normalizeArticleLanguage(req.query.language || req.query.lang);
    const normalizedPostType = postType ? normalizePostType(postType) : '';

    // Create cache key from query params
    const cacheKey = `list:${page}:${limit}:${category || ''}:${tag || ''}:${sortBy}:${sortOrder}:${isBreaking || ''}:${isFeatured || ''}:${normalizedPostType || ''}:${requestedLanguage || ''}`;
    
    // Try cache first
    const cached = await cacheService.getArticleList(cacheKey);
    if (cached) {
        return paginatedResponse(res, cached.articles, cached.pagination);
    }

    const filter = {status: 'published'};

    if (category) {
        const cat = await Category.findOne({slug: category});
        if (cat) filter.category = cat._id;
    }

    if (tag) {
        filter.tags = {$in: [tag.toLowerCase()]};
    }

    // Filter by isBreaking
    if (isBreaking === 'true') {
        filter.isBreaking = true;
    }

    // Filter by isFeatured
    if (isFeatured === 'true') {
        filter.isFeatured = true;
    }
    if (normalizedPostType) {
        filter.postType = normalizedPostType;
    }

    const sort = {[sortBy]: sortOrder === 'asc' ? 1 : -1};

    const [articles, total] = await Promise.all([
        Article.find(filter)
            .populate('author', 'firstName lastName avatar')
            .populate('category', 'name slug color')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .select('-content')
            .lean(), // Use lean() for better performance
        Article.countDocuments(filter),
    ]);

    const localizedArticles = await applyPreferredLanguageToArticles(articles, requestedLanguage);

    // Cache the result
    const pagination = {page, limit, total};
    await cacheService.setArticleList(cacheKey, {articles: localizedArticles, pagination}, config.cache.listTTL);

    return paginatedResponse(res, localizedArticles, pagination);
});

/**
 * Get featured articles - WITH CACHING
 * GET /api/articles/featured
 */
export const getFeaturedArticles = asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 5, 10);
    const requestedLanguage = normalizeArticleLanguage(req.query.language || req.query.lang);

    // Try cache first
    const cacheKey = `featured:${limit}:${requestedLanguage || ''}`;
    const cached = await cacheService.getArticleList(cacheKey);
    if (cached) {
        return successResponse(res, {articles: cached});
    }

    const articles = await Article.find({status: 'published', isFeatured: true})
        .populate('author', 'firstName lastName avatar')
        .populate('category', 'name slug color')
        .sort({publishedAt: -1})
        .limit(limit)
        .select('-content')
        .lean();

    const localizedArticles = await applyPreferredLanguageToArticles(articles, requestedLanguage);

    // Cache for 5 minutes
    await cacheService.setArticleList(cacheKey, localizedArticles, config.cache.featuredTTL);

    return successResponse(res, {articles: localizedArticles});
});

/**
 * Get latest articles - WITH CACHING
 * GET /api/articles/latest
 */
export const getLatestArticles = asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 20);
    const requestedLanguage = normalizeArticleLanguage(req.query.language || req.query.lang);

    // Try cache first
    const cacheKey = `latest:${limit}:${requestedLanguage || ''}`;
    const cached = await cacheService.getArticleList(cacheKey);
    if (cached) {
        return successResponse(res, {articles: cached});
    }

    const articles = await Article.find({status: 'published'})
        .populate('author', 'firstName lastName avatar')
        .populate('category', 'name slug color')
        .sort({publishedAt: -1})
        .limit(limit)
        .select('-content')
        .lean();

    const localizedArticles = await applyPreferredLanguageToArticles(articles, requestedLanguage);

    // Cache for 3 minutes
    await cacheService.setArticleList(cacheKey, localizedArticles, config.cache.listTTL);

    return successResponse(res, {articles: localizedArticles});
});

/**
 * Get article by slug (public) - WITH CACHING
 * GET /api/articles/:slug
 */
export const getArticleBySlug = asyncHandler(async (req, res) => {
    const {slug} = req.params;

    // Try cache first
    const cached = await cacheService.getArticle(slug);
    if (cached) {
        return successResponse(res, {article: cached});
    }

    const article = await Article.findOne({slug, status: 'published'})
        .populate('author', 'firstName lastName avatar bio')
        .populate('category', 'name slug color')
        .lean();

    if (!article) {
        return notFoundResponse(res, 'Article not found');
    }

    // Cache for 10 minutes
    await cacheService.setArticle(slug, article, config.cache.articleTTL);

    return successResponse(res, {article});
});

/**
 * Resolve article by slug and preferred language (public)
 * GET /api/articles/resolve/:slug?language=km
 */
export const resolveArticleBySlug = asyncHandler(async (req, res) => {
    const {slug} = req.params;
    const requestedLanguage = normalizeArticleLanguage(req.query.language || req.query.lang);

    let article = await Article.findOne({slug, status: 'published'})
        .populate('author', 'firstName lastName avatar bio')
        .populate('category', 'name slug color')
        .lean();
    let matchedLanguage = '';

    if (article) {
        matchedLanguage = normalizeArticleLanguage(article.language) || 'en';
    } else {
        const slugTranslation = await ArticleTranslation.findOne({slug}).lean();
        if (!slugTranslation) {
            return notFoundResponse(res, 'Article not found');
        }

        article = await Article.findOne({_id: slugTranslation.articleId, status: 'published'})
            .populate('author', 'firstName lastName avatar bio')
            .populate('category', 'name slug color')
            .lean();
        if (!article) {
            return notFoundResponse(res, 'Article not found');
        }

        matchedLanguage = normalizeArticleLanguage(slugTranslation.language) || normalizeArticleLanguage(article.language) || 'en';
    }

    const baseLanguage = normalizeArticleLanguage(article.language) || 'en';
    const allTranslations = await ArticleTranslation.find({
        articleId: article._id,
    })
        .select('language slug title excerpt content metaTitle metaDescription metaKeywords translationStatus updatedAt createdAt')
        .sort({updatedAt: -1, createdAt: -1})
        .lean();

    const statusScore = {
        published: 4,
        review: 3,
        in_progress: 2,
        draft: 1,
    };

    const translationsByLanguage = new Map();
    for (const translation of allTranslations) {
        const languageCode = normalizeArticleLanguage(translation.language);
        if (!languageCode || languageCode === baseLanguage) {
            continue;
        }

        const existing = translationsByLanguage.get(languageCode);
        if (!existing) {
            translationsByLanguage.set(languageCode, translation);
            continue;
        }

        const existingScore = statusScore[existing.translationStatus] || 0;
        const nextScore = statusScore[translation.translationStatus] || 0;
        if (nextScore > existingScore) {
            translationsByLanguage.set(languageCode, translation);
        }
    }

    const targetLanguage = requestedLanguage || matchedLanguage || baseLanguage;
    const selectedTranslation = targetLanguage !== baseLanguage ? translationsByLanguage.get(targetLanguage) : null;
    const availableLanguages = Array.from(new Set([baseLanguage, ...Array.from(translationsByLanguage.keys())]));

    const languageVersions = [
        {language: baseLanguage, slug: article.slug, isOriginal: true},
        ...Array.from(translationsByLanguage.entries()).map(([language, translation]) => ({
            language,
            slug: translation.slug,
            isOriginal: false,
        })),
    ];

    const resolvedArticle = selectedTranslation
        ? {
            ...article,
            title: selectedTranslation.title || article.title,
            slug: selectedTranslation.slug || article.slug,
            excerpt: selectedTranslation.excerpt ?? article.excerpt,
            content: selectedTranslation.content || article.content,
            metaTitle: selectedTranslation.metaTitle || article.metaTitle,
            metaDescription: selectedTranslation.metaDescription || article.metaDescription,
            metaKeywords: Array.isArray(selectedTranslation.metaKeywords) && selectedTranslation.metaKeywords.length > 0
                ? selectedTranslation.metaKeywords
                : article.metaKeywords,
            language: targetLanguage,
            availableLanguages,
            originalSlug: article.slug,
            originalLanguage: baseLanguage,
            isTranslation: true,
        }
        : {
            ...article,
            language: baseLanguage,
            availableLanguages,
            originalSlug: article.slug,
            originalLanguage: baseLanguage,
            isTranslation: false,
        };

    const resolvedLanguage = resolvedArticle.language || baseLanguage;
    const resolvedSlug = resolvedArticle.slug || article.slug;

    return successResponse(res, {
        article: resolvedArticle,
        language: {
            requested: requestedLanguage || null,
            resolved: resolvedLanguage,
            usedFallback: Boolean(requestedLanguage && requestedLanguage !== resolvedLanguage),
            available: availableLanguages,
            versions: languageVersions,
            resolvedSlug,
        },
    });
});

/**
 * Get article by ID
 * GET /api/articles/id/:id
 */
export const getArticleById = asyncHandler(async (req, res) => {
    const article = await Article.findById(req.params.id)
        .populate('author', 'firstName lastName avatar')
        .populate('category', 'name slug color')
        .populate('reviewedBy', 'firstName lastName');

    if (!article) {
        return notFoundResponse(res, 'Article not found');
    }

    // Check access
    const isOwner = article.author._id.toString() === req.user._id.toString();
    const isEditorOrAdmin = ['admin', 'editor'].includes(req.user.role);

    if (!isOwner && !isEditorOrAdmin && article.status !== 'published') {
        return forbiddenResponse(res, 'You do not have access to this article');
    }

    return successResponse(res, {article});
});

/**
 * Update article
 * PUT /api/articles/:id
 */
export const updateArticle = asyncHandler(async (req, res) => {
    const article = await Article.findById(req.params.id);

    if (!article) {
        return notFoundResponse(res, 'Article not found');
    }
    const previousFeaturedImage = article.featuredImage;

    // Check ownership or admin/editor role
    const isOwner = article.author.toString() === req.user._id.toString();
    const isAdminOrEditor = ['admin', 'editor'].includes(req.user.role);

    if (!isOwner && !isAdminOrEditor) {
        return forbiddenResponse(res, 'You do not have permission to edit this article');
    }

    // If article is published and user is only the owner (not admin/editor), restrict editing
    if (article.status === 'published' && !isAdminOrEditor) {
        return badRequestResponse(res, 'Cannot edit published article. Please contact an editor.');
    }

    const oldSlug = article.slug;
    const {
        title, content, excerpt, category, tags, 
        metaTitle, metaDescription, featuredImage, featuredImagePosition,
        featuredImagePositionY, featuredImageAlt, status, isFeatured, isBreaking,
        postType, videoUrl
    } = req.body;

    if (title) article.title = title;
    if (content) article.content = sanitizeEditorContent(content);
    if (excerpt !== undefined) article.excerpt = excerpt;
    if (category) {
        const categoryExists = await Category.findById(category);
        if (!categoryExists) {
            return badRequestResponse(res, 'Category not found');
        }
        article.category = category;
    }
    if (tags) article.tags = tags;
    if (metaTitle !== undefined) article.metaTitle = metaTitle;
    if (metaDescription !== undefined) article.metaDescription = metaDescription;
    if (featuredImage !== undefined) article.featuredImage = featuredImage;
    if (featuredImagePosition !== undefined) article.featuredImagePosition = featuredImagePosition;
    if (featuredImagePositionY !== undefined) article.featuredImagePositionY = featuredImagePositionY;
    if (featuredImageAlt !== undefined) article.featuredImageAlt = featuredImageAlt;
    if (postType !== undefined) {
        article.postType = normalizePostType(postType);
    }
    if (videoUrl !== undefined) {
        article.videoUrl = normalizeVideoUrl(videoUrl);
    }
    if (article.postType !== 'video') {
        article.videoUrl = '';
    }
    if (article.postType === 'video' && !article.videoUrl) {
        return badRequestResponse(res, 'Video URL is required for video posts');
    }
    if (article.postType === 'video') {
        const hasBlocks = Array.isArray(article.content?.blocks) && article.content.blocks.length > 0;
        if (!hasBlocks) {
            article.content = sanitizeEditorContent(
                buildVideoFallbackContent({
                    title: article.title,
                    excerpt: article.excerpt,
                    videoUrl: article.videoUrl,
                })
            );
        }
    }

    // Featured and breaking flags - only admin/editor can change
    if (isAdminOrEditor) {
        if (isFeatured !== undefined) article.isFeatured = isFeatured;
        if (isBreaking !== undefined) article.isBreaking = isBreaking;
    }

    const submitForReview = status === 'pending' && article.status === 'draft';

    // Status changes
    if (status) {
        if (status === 'pending' && article.status === 'draft') {
            // Writers can submit for review
            article.status = 'pending';
        } else if (status === 'draft' && article.status === 'rejected' && isOwner) {
            // Writers can revise rejected articles
            article.status = 'draft';
            article.rejectionReason = '';
        } else if (isAdminOrEditor) {
            // Admins/Editors can change any status
            article.status = status;
            if (status === 'published' && !article.publishedAt) {
                article.publishedAt = new Date();
            }
        }
    }

    article.lastEditedBy = req.user._id;
    await article.save();
    await syncFeaturedImageUsage(article._id, article.featuredImage, previousFeaturedImage);

    // Invalidate caches
    await cacheService.invalidateArticle(oldSlug);
    if (article.slug !== oldSlug) {
        await cacheService.invalidateArticle(article.slug);
    }
    await cacheService.invalidateArticleLists();

    await article.populate('author', 'firstName lastName avatar');
    await article.populate('category', 'name slug color');

    if (submitForReview) {
        try {
            const reviewers = await User.find({ role: { $in: ['admin', 'editor'] } }).select('_id');
            const reviewerIds = reviewers
                .map((u) => u._id)
                .filter((id) => id.toString() !== article.author._id.toString());
            if (reviewerIds.length) {
                const { default: notificationService } = await import('../services/notificationService.js');
                await notificationService.notifyArticleSubmitted(article, reviewerIds);
            }
        } catch (error) {
            console.error('Failed to send submission notification:', error);
        }
    }

    return successResponse(res, {article}, 'Article updated successfully');
});

/**
 * Delete article
 * DELETE /api/articles/:id
 */
export const deleteArticle = asyncHandler(async (req, res) => {
    const article = await Article.findById(req.params.id);

    if (!article) {
        return notFoundResponse(res, 'Article not found');
    }
    const featuredImage = article.featuredImage;

    const isOwner = article.author.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
        return forbiddenResponse(res, 'You do not have permission to delete this article');
    }

    const slug = article.slug;
    await article.deleteOne();
    await syncFeaturedImageUsage(article._id, null, featuredImage);

    // Invalidate caches
    await cacheService.invalidateArticle(slug);
    await cacheService.invalidateArticleLists();

    return successResponse(res, null, 'Article deleted successfully');
});

/**
 * Get my articles (writer)
 * GET /api/articles/my
 */
export const getMyArticles = asyncHandler(async (req, res) => {
    const {page, limit, skip} = parsePaginationParams(req.query);
    const {status, postType, sortBy = 'createdAt', sortOrder = 'desc'} = req.query;
    const requestedLanguage = normalizeArticleLanguage(req.query.language || req.query.lang);

    const filter = {author: req.user._id};
    if (status) filter.status = status;
    if (postType) filter.postType = normalizePostType(postType);

    const sort = {[sortBy]: sortOrder === 'asc' ? 1 : -1};

    const [articles, total] = await Promise.all([
        Article.find(filter)
            .populate('category', 'name slug color')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .select('-content'),
        Article.countDocuments(filter),
    ]);

    const localizedArticles = await applyPreferredLanguageToArticles(articles, requestedLanguage);
    return paginatedResponse(res, localizedArticles, {page, limit, total});
});

/**
 * Get all articles (admin)
 * GET /api/articles/admin
 */
export const getAllArticlesAdmin = asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePaginationParams(req.query);
    const { status, author, q, postType, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const requestedLanguage = normalizeArticleLanguage(req.query.language || req.query.lang);

    const filter = {};
    if (status) filter.status = status;
    if (author) filter.author = author;
    if (postType) filter.postType = normalizePostType(postType);
    if (q) {
        filter.title = { $regex: q, $options: 'i' };
    }

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [articles, total] = await Promise.all([
        Article.find(filter)
            .populate('author', 'firstName lastName avatar role')
            .populate('category', 'name slug color')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .select('-content'),
        Article.countDocuments(filter),
    ]);

    const localizedArticles = await applyPreferredLanguageToArticles(articles, requestedLanguage);
    return paginatedResponse(res, localizedArticles, { page, limit, total });
});

/**
 * Get pending articles (editor)
 * GET /api/articles/pending
 */
export const getPendingArticles = asyncHandler(async (req, res) => {
    const {page, limit, skip} = parsePaginationParams(req.query);
    const requestedLanguage = normalizeArticleLanguage(req.query.language || req.query.lang);

    const [articles, total] = await Promise.all([
        Article.find({status: 'pending'})
            .populate('author', 'firstName lastName avatar')
            .populate('category', 'name slug color')
            .sort({createdAt: -1})
            .skip(skip)
            .limit(limit)
            .select('-content'),
        Article.countDocuments({status: 'pending'}),
    ]);

    const localizedArticles = await applyPreferredLanguageToArticles(articles, requestedLanguage);
    return paginatedResponse(res, localizedArticles, {page, limit, total});
});

/**
 * Approve article (editor)
 * PUT /api/articles/:id/approve
 */
export const approveArticle = asyncHandler(async (req, res) => {
    const {notes} = req.body;

    const article = await Article.findById(req.params.id).populate('author');

    if (!article) {
        return notFoundResponse(res, 'Article not found');
    }

    if (article.status !== 'pending') {
        return badRequestResponse(res, 'Only pending articles can be approved');
    }

    article.status = 'published';
    article.publishedAt = new Date();
    article.reviewedBy = req.user._id;
    article.reviewedAt = new Date();
    article.reviewNotes = notes || '';
    article.content = sanitizeEditorContent(article.content);
    article.markModified('content');

    await article.save();

    // Update category article count
    await Category.findById(article.category).then((cat) => cat?.updateArticleCount());

    // Send real-time notification to author
    try {
        const { default: notificationService } = await import('../services/notificationService.js');
        await notificationService.notifyArticleApproved(article, article.author._id);
    } catch (error) {
        console.error('Failed to send approval notification:', error);
    }

    // Also send email notification
    try {
        await emailService.sendArticleApprovedEmail(article.author, article);
    } catch (error) {
        console.error('Failed to send approval email:', error);
    }

    return successResponse(res, {article}, 'Article approved and published');
});

/**
 * Reject article (editor)
 * PUT /api/articles/:id/reject
 */
export const rejectArticle = asyncHandler(async (req, res) => {
    const {reason} = req.body;

    const article = await Article.findById(req.params.id).populate('author');

    if (!article) {
        return notFoundResponse(res, 'Article not found');
    }

    if (article.status !== 'pending') {
        return badRequestResponse(res, 'Only pending articles can be rejected');
    }

    article.status = 'rejected';
    article.reviewedBy = req.user._id;
    article.reviewedAt = new Date();
    article.rejectionReason = reason;
    article.content = sanitizeEditorContent(article.content);
    article.markModified('content');

    await article.save();

    // Send real-time notification to author
    try {
        const { default: notificationService } = await import('../services/notificationService.js');
        await notificationService.notifyArticleRejected(article, article.author._id, reason);
    } catch (error) {
        console.error('Failed to send rejection notification:', error);
    }

    // Also send email notification
    try {
        await emailService.sendArticleRejectedEmail(article.author, article, reason);
    } catch (error) {
        console.error('Failed to send rejection email:', error);
    }

    return successResponse(res, {article}, 'Article rejected');
});

/**
 * Record article view - BUFFERED for performance
 * POST /api/articles/:id/view
 */
export const recordView = asyncHandler(async (req, res) => {
    const articleId = req.params.id;
    
    // Quick validation without DB hit
    if (!articleId.match(/^[0-9a-fA-F]{24}$/)) {
        return notFoundResponse(res, 'Article not found');
    }

    // Generate visitor hash for unique counting
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';
    const visitorHash = generateHash(`${ip}-${userAgent}`);

    // Buffer view count instead of immediate DB write
    // This will be flushed to DB every 5 minutes
    const bufferedCount = await cacheService.bufferViewCount(articleId);
    
    // Record in analytics (can be async, don't wait)
    analyticsHelpers.recordPageView(articleId, visitorHash).catch(() => {});

    // Return estimated view count (actual count + buffered)
    return successResponse(res, {viewCount: bufferedCount});
});

/**
 * Get related articles
 * GET /api/articles/:id/related
 */
export const getRelatedArticles = asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 4, 10);
    const requestedLanguage = normalizeArticleLanguage(req.query.language || req.query.lang);

    const articles = await Article.findRelated(req.params.id, limit);
    const localizedArticles = await applyPreferredLanguageToArticles(articles, requestedLanguage);

    return successResponse(res, {articles: localizedArticles});
});

/**
 * Search articles
 * GET /api/articles/search
 */
export const searchArticles = asyncHandler(async (req, res) => {
    const {q} = req.query;
    const requestedLanguage = normalizeArticleLanguage(req.query.language || req.query.lang);
    const {page, limit, skip} = parsePaginationParams(req.query);

    if (!q || q.length < 2) {
        return badRequestResponse(res, 'Search query must be at least 2 characters');
    }

    const filter = {
        status: 'published',
        $text: {$search: q},
    };

    const [articles, total] = await Promise.all([
        Article.find(filter, {score: {$meta: 'textScore'}})
            .populate('author', 'firstName lastName avatar')
            .populate('category', 'name slug color')
            .sort({score: {$meta: 'textScore'}})
            .skip(skip)
            .limit(limit)
            .select('-content')
            .lean(),
        Article.countDocuments(filter),
    ]);

    const localizedArticles = await applyPreferredLanguageToArticles(articles, requestedLanguage);

    return paginatedResponse(res, localizedArticles, {page, limit, total});
});

/**
 * Get articles by category
 * GET /api/articles/category/:slug
 */
export const getArticlesByCategory = asyncHandler(async (req, res) => {
    const {slug} = req.params;
    const requestedLanguage = normalizeArticleLanguage(req.query.language || req.query.lang);
    const {page, limit, skip} = parsePaginationParams(req.query);

    const category = await Category.findOne({slug, isActive: true});
    if (!category) {
        return notFoundResponse(res, 'Category not found');
    }

    const filter = {status: 'published', category: category._id};

    const [articles, total] = await Promise.all([
        Article.find(filter)
            .populate('author', 'firstName lastName avatar')
            .populate('category', 'name slug color')
            .sort({publishedAt: -1})
            .skip(skip)
            .limit(limit)
            .select('-content')
            .lean(),
        Article.countDocuments(filter),
    ]);

    const localizedArticles = await applyPreferredLanguageToArticles(articles, requestedLanguage);

    // Return category in data, articles for pagination wrapper
    return successResponse(res, {
        category,
        articles: localizedArticles,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
    });
});

/**
 * Get article insights (staff)
 * GET /api/articles/:id/insights
 */
export const getArticleInsights = asyncHandler(async (req, res) => {
    const {id} = req.params;
    const {startDate, endDate} = req.query;

    const article = await Article.findById(id)
        .select('title slug status viewCount createdAt updatedAt publishedAt author')
        .populate('author', 'firstName lastName');

    if (!article) {
        return notFoundResponse(res, 'Article not found');
    }

    const match = {article: id};
    if (startDate || endDate) {
        const parsedStart = startDate ? new Date(startDate) : null;
        const parsedEnd = endDate ? new Date(endDate) : null;
        if ((parsedStart && Number.isNaN(parsedStart.getTime())) || (parsedEnd && Number.isNaN(parsedEnd.getTime()))) {
            return badRequestResponse(res, 'Invalid date range');
        }
        match.date = {};
        if (parsedStart) match.date.$gte = parsedStart;
        if (parsedEnd) match.date.$lte = parsedEnd;
    }

    const daily = await PageView.find(match)
        .sort({date: 1})
        .select('date views uniqueVisitors')
        .lean();

    const totals = daily.reduce(
        (acc, day) => ({
            views: acc.views + (day.views || 0),
            uniqueVisitors: acc.uniqueVisitors + (day.uniqueVisitors || 0),
        }),
        {views: 0, uniqueVisitors: 0}
    );

    const stats = {
        views: article.viewCount || totals.views || 0,
        trackedViews: totals.views || 0,
        uniqueVisitors: totals.uniqueVisitors || 0,
    };

    return successResponse(res, {article, stats, daily});
});

export default {
    createArticle,
    getArticles,
    getFeaturedArticles,
    getLatestArticles,
    getArticleBySlug,
    resolveArticleBySlug,
    getArticleById,
    updateArticle,
    deleteArticle,
    getMyArticles,
    getAllArticlesAdmin,
    getPendingArticles,
    approveArticle,
    rejectArticle,
    recordView,
    getRelatedArticles,
    searchArticles,
    getArticlesByCategory,
    getArticleInsights,
};
