import {Article, ArticleTranslation, Category, Media, User} from '../models/index.js';
import {analyticsHelpers, PageView} from '../models/Analytics.js';
import {sanitizeEditorContent, parsePaginationParams, generateHash, getClientIp} from '../utils/helpers.js';
import emailService from '../services/emailService.js';
import cacheService from '../services/cacheService.js';
import config from '../config/index.js';
import telegramService from '../services/telegramService.js';
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

const WORKFLOW_SOURCE_STATES = Object.freeze({
    DRAFT: 'draft',
    SUBMITTED: 'submitted',
    APPROVED: 'approved',
    CHANGES_REQUESTED: 'changes_requested',
});

const WORKFLOW_TRANSLATION_STATES = Object.freeze({
    NOT_REQUIRED: 'not_required',
    IN_TRANSLATION: 'in_translation',
    SUBMITTED: 'submitted',
    APPROVED: 'approved',
    CHANGES_REQUESTED: 'changes_requested',
});

const WORKFLOW_ADMIN_STATES = Object.freeze({
    NOT_READY: 'not_ready',
    PENDING_FINAL_REVIEW: 'pending_final_review',
    APPROVED: 'approved',
    REJECTED: 'rejected',
});

const WORKFLOW_AUDIT_MAX_ITEMS = 300;

const ensureArticleWorkflow = (article) => {
    if (!article.workflow) {
        article.workflow = {};
    }

    const workflow = article.workflow;
    workflow.sourceReviewState = workflow.sourceReviewState || WORKFLOW_SOURCE_STATES.DRAFT;
    workflow.translationState = workflow.translationState || WORKFLOW_TRANSLATION_STATES.NOT_REQUIRED;
    workflow.adminApprovalState = workflow.adminApprovalState || WORKFLOW_ADMIN_STATES.NOT_READY;
    workflow.assignedTranslator = workflow.assignedTranslator || null;

    if (!workflow.timestamps) {
        workflow.timestamps = {};
    }
    workflow.timestamps.sourceSubmittedAt = workflow.timestamps.sourceSubmittedAt || null;
    workflow.timestamps.sourceReviewedAt = workflow.timestamps.sourceReviewedAt || null;
    workflow.timestamps.translationSubmittedAt = workflow.timestamps.translationSubmittedAt || null;
    workflow.timestamps.translationReviewedAt = workflow.timestamps.translationReviewedAt || null;
    workflow.timestamps.adminReviewedAt = workflow.timestamps.adminReviewedAt || null;

    if (!workflow.reviewedBy) {
        workflow.reviewedBy = {};
    }
    workflow.reviewedBy.sourceReviewer = workflow.reviewedBy.sourceReviewer || null;
    workflow.reviewedBy.translationReviewer = workflow.reviewedBy.translationReviewer || null;
    workflow.reviewedBy.adminReviewer = workflow.reviewedBy.adminReviewer || null;

    workflow.sourceReviewNotes = workflow.sourceReviewNotes || '';
    workflow.translationReviewNotes = workflow.translationReviewNotes || '';
    workflow.adminReviewNotes = workflow.adminReviewNotes || '';
    workflow.auditTrail = Array.isArray(workflow.auditTrail) ? workflow.auditTrail : [];

    return workflow;
};

const ensureTranslationWorkflow = (translation) => {
    if (!translation.workflow) {
        translation.workflow = {};
    }
    const workflow = translation.workflow;
    workflow.translationState = workflow.translationState || 'draft';

    if (!workflow.timestamps) {
        workflow.timestamps = {};
    }
    workflow.timestamps.submittedAt = workflow.timestamps.submittedAt || null;
    workflow.timestamps.reviewedAt = workflow.timestamps.reviewedAt || null;

    if (!workflow.reviewedBy) {
        workflow.reviewedBy = {};
    }
    workflow.reviewedBy.submittedBy = workflow.reviewedBy.submittedBy || null;
    workflow.reviewedBy.reviewer = workflow.reviewedBy.reviewer || null;
    workflow.reviewNotes = workflow.reviewNotes || '';

    return workflow;
};

const hasApprovedTranslations = (article = {}) => {
    const baseLanguage = normalizeArticleLanguage(article.language);
    const availableLanguages = Array.isArray(article.availableLanguages) ? article.availableLanguages : [];
    return availableLanguages.some((lang) => {
        const normalized = normalizeArticleLanguage(lang);
        return normalized && normalized !== baseLanguage;
    });
};

const enforceWorkflowTransition = (res, currentState, allowedCurrentStates, errorMessage) => {
    if (!allowedCurrentStates.includes(currentState)) {
        badRequestResponse(
            res,
            `${errorMessage}. Current state: "${currentState}". Allowed: ${allowedCurrentStates.join(', ')}`
        );
        return false;
    }
    return true;
};

const buildWorkflowActorName = (user = null, fallback = 'System') => {
    const firstName = String(user?.firstName || '').trim();
    const lastName = String(user?.lastName || '').trim();
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || String(user?.username || user?.email || fallback);
};

const buildWorkflowArticleLink = (articleId = '') => {
    const normalizedId = String(articleId || '').trim();
    if (!normalizedId) {
        return '';
    }

    const baseUrl = String(config.frontendUrl || config.siteUrl || '').trim().replace(/\/+$/, '');
    if (!baseUrl) {
        return '';
    }

    return `${baseUrl}/dashboard/articles/${normalizedId}/edit`;
};

const sendTelegramWorkflowUpdate = ({
    targetRole = '',
    stage = '',
    article = null,
    language = '',
    submittedBy = '',
    dueAt = '',
} = {}) => {
    if (!targetRole || !stage || !article?._id) {
        return;
    }

    telegramService.sendWorkflowUpdateNonBlocking({
        targetRole,
        stage,
        articleId: article._id.toString(),
        title: article.title || '',
        language: normalizeArticleLanguage(language || article.language || ''),
        submittedBy,
        dueAt,
        link: buildWorkflowArticleLink(article._id),
    });
};

const captureWorkflowSnapshot = (article, workflow) => ({
    status: String(article?.status || 'draft'),
    sourceReviewState: String(workflow?.sourceReviewState || WORKFLOW_SOURCE_STATES.DRAFT),
    translationState: String(workflow?.translationState || WORKFLOW_TRANSLATION_STATES.NOT_REQUIRED),
    adminApprovalState: String(workflow?.adminApprovalState || WORKFLOW_ADMIN_STATES.NOT_READY),
});

const appendWorkflowAuditEntry = ({
    article,
    workflow,
    action,
    actor = null,
    notes = '',
    metadata = {},
    beforeSnapshot = null,
} = {}) => {
    if (!article || !workflow || !action) {
        return;
    }

    const trail = Array.isArray(workflow.auditTrail) ? workflow.auditTrail : [];
    trail.push({
        action: String(action).trim(),
        actor: actor?._id || actor || null,
        actorRole: String(actor?.role || '').trim(),
        notes: String(notes || '').trim(),
        before: beforeSnapshot,
        after: captureWorkflowSnapshot(article, workflow),
        metadata: metadata && typeof metadata === 'object' ? metadata : {},
        at: new Date(),
    });

    workflow.auditTrail = trail.slice(-WORKFLOW_AUDIT_MAX_ITEMS);
    article.markModified('workflow');
};

const buildQueuePagination = ({ total = 0, limit = 20 } = {}) => ({
    total,
    limit,
    totalPages: Math.max(1, Math.ceil(total / Math.max(limit, 1))),
});

const attachSubmittedTranslationLanguages = async (articles = []) => {
    const normalizedArticles = Array.isArray(articles) ? articles.filter(Boolean) : [];
    if (!normalizedArticles.length) {
        return [];
    }

    const articleIds = normalizedArticles.map((article) => article._id).filter(Boolean);
    if (!articleIds.length) {
        return normalizedArticles;
    }

    const submittedTranslations = await ArticleTranslation.find({
        articleId: { $in: articleIds },
        'workflow.translationState': 'submitted',
    })
        .select('articleId language updatedAt createdAt')
        .sort({ updatedAt: -1, createdAt: -1 })
        .lean();

    const languageMap = new Map();
    for (const translation of submittedTranslations) {
        const key = String(translation.articleId);
        const language = normalizeArticleLanguage(translation.language);
        if (!language) {
            continue;
        }
        const existing = languageMap.get(key) || [];
        if (!existing.includes(language)) {
            existing.push(language);
            languageMap.set(key, existing);
        }
    }

    return normalizedArticles.map((article) => {
        const submittedLanguages = languageMap.get(String(article._id)) || [];
        return {
            ...article,
            pendingTranslationLanguages: submittedLanguages,
            pendingTranslationLanguage: submittedLanguages[0] || '',
        };
    });
};

/**
 * Create article
 * POST /api/articles
 */
export const createArticle = asyncHandler(async (req, res) => {
    const {
        language,
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
    const articleLanguage = normalizeArticleLanguage(language) || 'en';
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

    const workflowTimestamp = new Date();
    const initialWorkflowSnapshot = {
        status: articleStatus,
        sourceReviewState:
            articleStatus === 'pending'
                ? WORKFLOW_SOURCE_STATES.SUBMITTED
                : articleStatus === 'published'
                    ? WORKFLOW_SOURCE_STATES.APPROVED
                    : articleStatus === 'rejected'
                        ? WORKFLOW_SOURCE_STATES.CHANGES_REQUESTED
                        : WORKFLOW_SOURCE_STATES.DRAFT,
        translationState: WORKFLOW_TRANSLATION_STATES.NOT_REQUIRED,
        adminApprovalState:
            articleStatus === 'published'
                ? WORKFLOW_ADMIN_STATES.APPROVED
                : WORKFLOW_ADMIN_STATES.NOT_READY,
    };

    const workflow = {
        sourceReviewState: initialWorkflowSnapshot.sourceReviewState,
        translationState: initialWorkflowSnapshot.translationState,
        adminApprovalState: initialWorkflowSnapshot.adminApprovalState,
        assignedTranslator: null,
        timestamps: {
            sourceSubmittedAt: articleStatus === 'pending' ? workflowTimestamp : null,
            sourceReviewedAt: articleStatus === 'published' ? workflowTimestamp : null,
            translationSubmittedAt: null,
            translationReviewedAt: null,
            adminReviewedAt: articleStatus === 'published' ? (publishedAt || workflowTimestamp) : null,
        },
        reviewedBy: {
            sourceReviewer: articleStatus === 'published' ? req.user._id : null,
            translationReviewer: null,
            adminReviewer: articleStatus === 'published' ? req.user._id : null,
        },
        sourceReviewNotes: '',
        translationReviewNotes: '',
        adminReviewNotes: '',
        auditTrail: [
            {
                action: 'article_created',
                actor: req.user._id,
                actorRole: req.user.role,
                notes: '',
                before: null,
                after: initialWorkflowSnapshot,
                metadata: { via: 'create_article' },
                at: workflowTimestamp,
            },
            ...(articleStatus === 'pending'
                ? [{
                    action: 'source_submitted',
                    actor: req.user._id,
                    actorRole: req.user.role,
                    notes: '',
                    before: {
                        status: 'draft',
                        sourceReviewState: WORKFLOW_SOURCE_STATES.DRAFT,
                        translationState: WORKFLOW_TRANSLATION_STATES.NOT_REQUIRED,
                        adminApprovalState: WORKFLOW_ADMIN_STATES.NOT_READY,
                    },
                    after: initialWorkflowSnapshot,
                    metadata: { via: 'create_article' },
                    at: workflowTimestamp,
                }]
                : []),
            ...(articleStatus === 'published'
                ? [{
                    action: 'final_published',
                    actor: req.user._id,
                    actorRole: req.user.role,
                    notes: '',
                    before: {
                        status: 'pending',
                        sourceReviewState: WORKFLOW_SOURCE_STATES.APPROVED,
                        translationState: WORKFLOW_TRANSLATION_STATES.NOT_REQUIRED,
                        adminApprovalState: WORKFLOW_ADMIN_STATES.PENDING_FINAL_REVIEW,
                    },
                    after: initialWorkflowSnapshot,
                    metadata: { via: 'create_article' },
                    at: workflowTimestamp,
                }]
                : []),
        ],
    };

    const article = await Article.create({
        language: articleLanguage,
        availableLanguages: [articleLanguage],
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
        workflow,
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

        sendTelegramWorkflowUpdate({
            targetRole: 'editor',
            stage: 'SOURCE SUBMITTED',
            article,
            submittedBy: buildWorkflowActorName(article.author, 'Writer'),
        });
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
        .populate('reviewedBy', 'firstName lastName')
        .populate('workflow.reviewedBy.sourceReviewer', 'firstName lastName role')
        .populate('workflow.reviewedBy.translationReviewer', 'firstName lastName role')
        .populate('workflow.reviewedBy.adminReviewer', 'firstName lastName role')
        .populate('workflow.assignedTranslator', 'firstName lastName role')
        .populate('workflow.auditTrail.actor', 'firstName lastName username email role');

    if (!article) {
        return notFoundResponse(res, 'Article not found');
    }

    // Check access
    const isOwner = article.author._id.toString() === req.user._id.toString();
    const isEditorOrAdmin = ['admin', 'editor'].includes(req.user.role);
    const isTranslator = req.user.role === 'translator';

    if (!isOwner && !isEditorOrAdmin && !isTranslator && article.status !== 'published') {
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
        language,
        title, content, excerpt, category, tags, 
        metaTitle, metaDescription, featuredImage, featuredImagePosition,
        featuredImagePositionY, featuredImageAlt, status, isFeatured, isBreaking,
        postType, videoUrl
    } = req.body;

    if (language !== undefined) {
        const normalizedLanguage = normalizeArticleLanguage(language);
        if (!normalizedLanguage) {
            return badRequestResponse(res, 'Valid language is required');
        }
        article.language = normalizedLanguage;
    }
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

    const workflow = ensureArticleWorkflow(article);
    const workflowBeforeSnapshot = captureWorkflowSnapshot(article, workflow);
    const submitForReview = status === 'pending' && article.status === 'draft';
    let workflowAuditAction = '';
    let workflowAuditNotes = '';
    let workflowAuditMetadata = {};

    // Status changes
    if (status) {
        if (status === 'pending' && article.status === 'draft') {
            // Writers can submit for review
            article.status = 'pending';
            workflow.sourceReviewState = WORKFLOW_SOURCE_STATES.SUBMITTED;
            workflow.translationState = WORKFLOW_TRANSLATION_STATES.NOT_REQUIRED;
            workflow.adminApprovalState = WORKFLOW_ADMIN_STATES.NOT_READY;
            workflow.timestamps.sourceSubmittedAt = new Date();
            workflow.sourceReviewNotes = '';
            workflow.translationReviewNotes = '';
            workflow.adminReviewNotes = '';
            workflow.reviewedBy.sourceReviewer = null;
            workflow.reviewedBy.translationReviewer = null;
            workflow.reviewedBy.adminReviewer = null;
            workflow.assignedTranslator = null;
            workflowAuditAction = 'source_submitted';
            workflowAuditMetadata = { via: 'update_article' };
        } else if (status === 'draft' && article.status === 'rejected' && isOwner) {
            // Writers can revise rejected articles
            article.status = 'draft';
            article.rejectionReason = '';
            workflow.sourceReviewState = WORKFLOW_SOURCE_STATES.DRAFT;
            workflow.translationState = WORKFLOW_TRANSLATION_STATES.NOT_REQUIRED;
            workflow.adminApprovalState = WORKFLOW_ADMIN_STATES.NOT_READY;
            workflow.sourceReviewNotes = '';
            workflow.translationReviewNotes = '';
            workflow.adminReviewNotes = '';
            workflowAuditAction = 'source_reopened_as_draft';
            workflowAuditMetadata = { via: 'update_article' };
        } else if (isAdminOrEditor) {
            // Admins/Editors can change any status
            article.status = status;
            if (status === 'published' && !article.publishedAt) {
                article.publishedAt = new Date();
            }

            if (status === 'published') {
                workflow.sourceReviewState = WORKFLOW_SOURCE_STATES.APPROVED;
                workflow.translationState = hasApprovedTranslations(article)
                    ? WORKFLOW_TRANSLATION_STATES.APPROVED
                    : WORKFLOW_TRANSLATION_STATES.NOT_REQUIRED;
                workflow.adminApprovalState = WORKFLOW_ADMIN_STATES.APPROVED;
                workflow.timestamps.sourceReviewedAt = new Date();
                workflow.timestamps.adminReviewedAt = article.publishedAt || new Date();
                workflow.reviewedBy.sourceReviewer = req.user._id;
                workflow.reviewedBy.adminReviewer = req.user._id;
                workflowAuditAction = 'final_published';
                workflowAuditMetadata = { via: 'update_article' };
            }

            if (status === 'rejected') {
                workflow.sourceReviewState = WORKFLOW_SOURCE_STATES.CHANGES_REQUESTED;
                workflow.translationState = WORKFLOW_TRANSLATION_STATES.NOT_REQUIRED;
                workflow.adminApprovalState = WORKFLOW_ADMIN_STATES.NOT_READY;
                workflow.timestamps.sourceReviewedAt = new Date();
                workflow.reviewedBy.sourceReviewer = req.user._id;
                workflowAuditAction = 'source_changes_requested';
                workflowAuditNotes = article.rejectionReason || article.reviewNotes || '';
                workflowAuditMetadata = { via: 'update_article' };
            }
        }
    }

    if (workflowAuditAction) {
        appendWorkflowAuditEntry({
            article,
            workflow,
            action: workflowAuditAction,
            actor: req.user,
            notes: workflowAuditNotes,
            metadata: workflowAuditMetadata,
            beforeSnapshot: workflowBeforeSnapshot,
        });
    }

    article.availableLanguages = normalizeLanguageList(article.availableLanguages, article.language || 'en');
    article.lastEditedBy = req.user._id;
    article.markModified('workflow');
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

        sendTelegramWorkflowUpdate({
            targetRole: 'editor',
            stage: 'SOURCE SUBMITTED',
            article,
            submittedBy: buildWorkflowActorName(article.author, 'Writer'),
        });
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
    const pendingFilter = {
        status: 'pending',
        $or: [
            {'workflow.sourceReviewState': WORKFLOW_SOURCE_STATES.SUBMITTED},
            {'workflow.sourceReviewState': {$exists: false}},
        ],
    };

    const [articles, total] = await Promise.all([
        Article.find(pendingFilter)
            .populate('author', 'firstName lastName avatar')
            .populate('category', 'name slug color')
            .sort({createdAt: -1})
            .skip(skip)
            .limit(limit)
            .select('-content'),
        Article.countDocuments(pendingFilter),
    ]);

    const localizedArticles = await applyPreferredLanguageToArticles(articles, requestedLanguage);
    return paginatedResponse(res, localizedArticles, {page, limit, total});
});

/**
 * Workflow queue for editors
 * GET /api/articles/workflow/editor-queue
 */
export const getEditorWorkflowQueue = asyncHandler(async (req, res) => {
    const sourceLimit = Math.min(Math.max(parseInt(req.query.sourceLimit, 10) || 20, 1), 100);
    const translationLimit = Math.min(Math.max(parseInt(req.query.translationLimit, 10) || 20, 1), 100);

    const sourceFilter = {
        status: 'pending',
        $or: [
            { 'workflow.sourceReviewState': WORKFLOW_SOURCE_STATES.SUBMITTED },
            { 'workflow.sourceReviewState': { $exists: false } },
        ],
    };

    const translationFilter = {
        status: 'pending',
        'workflow.sourceReviewState': WORKFLOW_SOURCE_STATES.APPROVED,
        'workflow.translationState': WORKFLOW_TRANSLATION_STATES.SUBMITTED,
    };

    const [sourceReview, sourceTotal, translationReviewRaw, translationTotal] = await Promise.all([
        Article.find(sourceFilter)
            .populate('author', 'firstName lastName email avatar')
            .populate('category', 'name slug color')
            .populate('workflow.assignedTranslator', 'firstName lastName email')
            .sort({ 'workflow.timestamps.sourceSubmittedAt': 1, createdAt: 1 })
            .limit(sourceLimit)
            .select('-content')
            .lean(),
        Article.countDocuments(sourceFilter),
        Article.find(translationFilter)
            .populate('author', 'firstName lastName email avatar')
            .populate('category', 'name slug color')
            .populate('workflow.assignedTranslator', 'firstName lastName email')
            .sort({ 'workflow.timestamps.translationSubmittedAt': 1, updatedAt: 1 })
            .limit(translationLimit)
            .select('-content')
            .lean(),
        Article.countDocuments(translationFilter),
    ]);

    const translationReview = await attachSubmittedTranslationLanguages(translationReviewRaw);

    return successResponse(res, {
        sourceReview,
        translationReview,
        counts: {
            sourceReview: sourceTotal,
            translationReview: translationTotal,
        },
        pagination: {
            sourceReview: buildQueuePagination({ total: sourceTotal, limit: sourceLimit }),
            translationReview: buildQueuePagination({ total: translationTotal, limit: translationLimit }),
        },
    });
});

/**
 * Workflow queue for translation contributors (translator + writer).
 * - Translator: assigned tasks + unassigned tasks ready for pickup.
 * - Writer: own tasks + explicitly assigned tasks only.
 * GET /api/articles/workflow/translator-queue
 */
export const getTranslatorWorkflowQueue = asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 100);
    const isWriterRole = req.user?.role === 'writer';
    const translationAssigneeFilter = isWriterRole
        ? [
            { author: req.user._id },
            { 'workflow.assignedTranslator': req.user._id },
        ]
        : [
            { 'workflow.assignedTranslator': req.user._id },
            { 'workflow.assignedTranslator': null },
            { 'workflow.assignedTranslator': { $exists: false } },
        ];

    const filter = {
        status: 'pending',
        'workflow.sourceReviewState': WORKFLOW_SOURCE_STATES.APPROVED,
        'workflow.translationState': {
            $in: [WORKFLOW_TRANSLATION_STATES.IN_TRANSLATION, WORKFLOW_TRANSLATION_STATES.CHANGES_REQUESTED],
        },
        $or: translationAssigneeFilter,
    };

    const [assignedTasks, total] = await Promise.all([
        Article.find(filter)
            .populate('author', 'firstName lastName email avatar')
            .populate('category', 'name slug color')
            .populate('workflow.assignedTranslator', 'firstName lastName email')
            .sort({ 'workflow.timestamps.sourceReviewedAt': 1, updatedAt: 1 })
            .limit(limit)
            .select('-content')
            .lean(),
        Article.countDocuments(filter),
    ]);

    return successResponse(res, {
        assignedTasks,
        counts: { assignedTasks: total },
        pagination: { assignedTasks: buildQueuePagination({ total, limit }) },
    });
});

/**
 * Workflow queue for admin final review
 * GET /api/articles/workflow/admin-queue
 */
export const getAdminWorkflowQueue = asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 100);
    const filter = {
        status: 'pending',
        'workflow.sourceReviewState': WORKFLOW_SOURCE_STATES.APPROVED,
        'workflow.translationState': WORKFLOW_TRANSLATION_STATES.APPROVED,
        'workflow.adminApprovalState': WORKFLOW_ADMIN_STATES.PENDING_FINAL_REVIEW,
    };

    const [finalReview, total] = await Promise.all([
        Article.find(filter)
            .populate('author', 'firstName lastName email avatar')
            .populate('category', 'name slug color')
            .populate('workflow.assignedTranslator', 'firstName lastName email')
            .sort({ 'workflow.timestamps.translationReviewedAt': 1, updatedAt: 1 })
            .limit(limit)
            .select('-content')
            .lean(),
        Article.countDocuments(filter),
    ]);

    return successResponse(res, {
        finalReview,
        counts: { finalReview: total },
        pagination: { finalReview: buildQueuePagination({ total, limit }) },
    });
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

    const workflow = ensureArticleWorkflow(article);
    const workflowBeforeSnapshot = captureWorkflowSnapshot(article, workflow);
    if (workflow.sourceReviewState === WORKFLOW_SOURCE_STATES.DRAFT) {
        // Legacy fallback for older pending records without workflow backfill.
        workflow.sourceReviewState = WORKFLOW_SOURCE_STATES.SUBMITTED;
    }

    if (
        !enforceWorkflowTransition(
            res,
            workflow.sourceReviewState,
            [WORKFLOW_SOURCE_STATES.SUBMITTED],
            'Source approval requires submitted source'
        )
    ) {
        return;
    }

    article.status = 'pending';
    article.reviewedBy = req.user._id;
    article.reviewedAt = new Date();
    article.reviewNotes = notes || '';
    workflow.sourceReviewState = WORKFLOW_SOURCE_STATES.APPROVED;
    workflow.translationState = WORKFLOW_TRANSLATION_STATES.IN_TRANSLATION;
    workflow.adminApprovalState = WORKFLOW_ADMIN_STATES.NOT_READY;
    workflow.timestamps.sourceReviewedAt = article.reviewedAt;
    workflow.timestamps.adminReviewedAt = null;
    workflow.reviewedBy.sourceReviewer = req.user._id;
    workflow.reviewedBy.adminReviewer = null;
    workflow.sourceReviewNotes = notes || '';
    workflow.translationReviewNotes = '';
    workflow.adminReviewNotes = '';
    article.content = sanitizeEditorContent(article.content);
    appendWorkflowAuditEntry({
        article,
        workflow,
        action: 'source_approved',
        actor: req.user,
        notes: notes || '',
        metadata: { via: 'legacy_approve_endpoint' },
        beforeSnapshot: workflowBeforeSnapshot,
    });
    article.markModified('content');
    article.markModified('workflow');

    await article.save();

    try {
        const { default: notificationService } = await import('../services/notificationService.js');
        await notificationService.notifySourceApproved(article, article.author._id);

        if (workflow.assignedTranslator) {
            await notificationService.notifyTranslationAssigned(article, workflow.assignedTranslator, 'zh');
        } else {
            const translators = await User.find({ role: 'translator', status: 'active' }).select('_id');
            for (const translator of translators) {
                await notificationService.notifyTranslationAssigned(article, translator._id, 'zh');
            }
        }
    } catch (error) {
        console.error('Failed to send source approval notifications:', error);
    }

    sendTelegramWorkflowUpdate({
        targetRole: 'translator',
        stage: 'SOURCE APPROVED',
        article,
        language: 'zh',
        submittedBy: buildWorkflowActorName(req.user, 'Editor'),
    });

    return successResponse(res, {article}, 'Source approved and moved to translation');
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

    const workflow = ensureArticleWorkflow(article);
    const workflowBeforeSnapshot = captureWorkflowSnapshot(article, workflow);
    if (workflow.sourceReviewState === WORKFLOW_SOURCE_STATES.DRAFT) {
        // Legacy fallback for older pending records without workflow backfill.
        workflow.sourceReviewState = WORKFLOW_SOURCE_STATES.SUBMITTED;
    }
    if (
        !enforceWorkflowTransition(
            res,
            workflow.sourceReviewState,
            [WORKFLOW_SOURCE_STATES.SUBMITTED],
            'Source rejection requires submitted source'
        )
    ) {
        return;
    }

    article.status = 'rejected';
    article.reviewedBy = req.user._id;
    article.reviewedAt = new Date();
    article.rejectionReason = reason;
    workflow.sourceReviewState = WORKFLOW_SOURCE_STATES.CHANGES_REQUESTED;
    workflow.translationState = WORKFLOW_TRANSLATION_STATES.NOT_REQUIRED;
    workflow.adminApprovalState = WORKFLOW_ADMIN_STATES.NOT_READY;
    workflow.timestamps.sourceReviewedAt = article.reviewedAt;
    workflow.reviewedBy.sourceReviewer = req.user._id;
    workflow.sourceReviewNotes = reason || '';
    article.content = sanitizeEditorContent(article.content);
    appendWorkflowAuditEntry({
        article,
        workflow,
        action: 'source_changes_requested',
        actor: req.user,
        notes: reason || '',
        metadata: { via: 'legacy_reject_endpoint' },
        beforeSnapshot: workflowBeforeSnapshot,
    });
    article.markModified('content');
    article.markModified('workflow');

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
 * Workflow: Source submit by writer
 * POST /api/articles/:id/workflow/source-submit
 */
export const submitSourceForWorkflow = asyncHandler(async (req, res) => {
    const article = await Article.findById(req.params.id).populate('author');
    if (!article) {
        return notFoundResponse(res, 'Article not found');
    }

    if (article.author?._id?.toString() !== req.user._id.toString()) {
        return forbiddenResponse(res, 'Writers can only submit their own source articles');
    }

    const workflow = ensureArticleWorkflow(article);
    const workflowBeforeSnapshot = captureWorkflowSnapshot(article, workflow);
    if (
        !enforceWorkflowTransition(
            res,
            workflow.sourceReviewState,
            [WORKFLOW_SOURCE_STATES.DRAFT, WORKFLOW_SOURCE_STATES.CHANGES_REQUESTED],
            'Source cannot be submitted from this state'
        )
    ) {
        return;
    }

    workflow.sourceReviewState = WORKFLOW_SOURCE_STATES.SUBMITTED;
    workflow.translationState = WORKFLOW_TRANSLATION_STATES.NOT_REQUIRED;
    workflow.adminApprovalState = WORKFLOW_ADMIN_STATES.NOT_READY;
    workflow.timestamps.sourceSubmittedAt = new Date();
    workflow.sourceReviewNotes = '';
    workflow.translationReviewNotes = '';
    workflow.adminReviewNotes = '';
    workflow.reviewedBy.sourceReviewer = null;
    workflow.reviewedBy.translationReviewer = null;
    workflow.reviewedBy.adminReviewer = null;
    workflow.assignedTranslator = null;

    article.status = 'pending';
    article.reviewedBy = null;
    article.reviewedAt = null;
    article.reviewNotes = '';
    article.rejectionReason = '';
    appendWorkflowAuditEntry({
        article,
        workflow,
        action: 'source_submitted',
        actor: req.user,
        notes: '',
        metadata: { via: 'workflow_source_submit' },
        beforeSnapshot: workflowBeforeSnapshot,
    });
    article.markModified('workflow');
    await article.save();

    try {
        const reviewers = await User.find({ role: { $in: ['editor', 'admin'] } }).select('_id');
        const reviewerIds = reviewers
            .map((u) => u._id)
            .filter((id) => id.toString() !== article.author._id.toString());
        if (reviewerIds.length) {
            const { default: notificationService } = await import('../services/notificationService.js');
            await notificationService.notifyArticleSubmitted(article, reviewerIds);
        }
    } catch (error) {
        console.error('Failed to send workflow source submission notification:', error);
    }

    sendTelegramWorkflowUpdate({
        targetRole: 'editor',
        stage: 'SOURCE SUBMITTED',
        article,
        submittedBy: buildWorkflowActorName(article.author, 'Writer'),
    });

    return successResponse(res, { article }, 'Source submitted for editor review');
});

/**
 * Workflow: Source approve by editor
 * PUT /api/articles/:id/workflow/source-approve
 */
export const approveSourceForWorkflow = asyncHandler(async (req, res) => {
    const { notes = '', translatorId = null } = req.body;

    const article = await Article.findById(req.params.id).populate('author');
    if (!article) {
        return notFoundResponse(res, 'Article not found');
    }

    const workflow = ensureArticleWorkflow(article);
    const workflowBeforeSnapshot = captureWorkflowSnapshot(article, workflow);
    if (
        !enforceWorkflowTransition(
            res,
            workflow.sourceReviewState,
            [WORKFLOW_SOURCE_STATES.SUBMITTED],
            'Source approval requires a submitted source'
        )
    ) {
        return;
    }

    if (translatorId) {
        const translator = await User.findById(translatorId).select('_id role status');
        if (!translator || translator.role !== 'translator' || translator.status !== 'active') {
            return badRequestResponse(res, 'Assigned translator must be an active translator account');
        }
        workflow.assignedTranslator = translator._id;
    }

    workflow.sourceReviewState = WORKFLOW_SOURCE_STATES.APPROVED;
    workflow.translationState = WORKFLOW_TRANSLATION_STATES.IN_TRANSLATION;
    workflow.adminApprovalState = WORKFLOW_ADMIN_STATES.NOT_READY;
    workflow.timestamps.sourceReviewedAt = new Date();
    workflow.reviewedBy.sourceReviewer = req.user._id;
    workflow.sourceReviewNotes = notes || '';
    workflow.translationReviewNotes = '';
    workflow.adminReviewNotes = '';

    article.status = 'pending';
    article.reviewedBy = req.user._id;
    article.reviewedAt = new Date();
    article.reviewNotes = notes || '';
    article.rejectionReason = '';
    appendWorkflowAuditEntry({
        article,
        workflow,
        action: 'source_approved',
        actor: req.user,
        notes: notes || '',
        metadata: {
            via: 'workflow_source_approve',
            assignedTranslator: workflow.assignedTranslator ? workflow.assignedTranslator.toString() : '',
        },
        beforeSnapshot: workflowBeforeSnapshot,
    });
    article.markModified('workflow');
    await article.save();

    try {
        const { default: notificationService } = await import('../services/notificationService.js');
        await notificationService.notifySourceApproved(article, article.author._id);

        if (workflow.assignedTranslator) {
            await notificationService.notifyTranslationAssigned(article, workflow.assignedTranslator, 'zh');
        } else {
            const translators = await User.find({ role: 'translator', status: 'active' }).select('_id');
            for (const translator of translators) {
                await notificationService.notifyTranslationAssigned(article, translator._id, 'zh');
            }
        }
    } catch (error) {
        console.error('Failed to send source-approval/translation-assignment notifications:', error);
    }

    sendTelegramWorkflowUpdate({
        targetRole: 'translator',
        stage: 'SOURCE APPROVED',
        article,
        language: 'zh',
        submittedBy: buildWorkflowActorName(req.user, 'Editor'),
    });

    return successResponse(res, { article }, 'Source approved and moved to translation stage');
});

/**
 * Workflow: Source changes requested by editor
 * PUT /api/articles/:id/workflow/source-request-changes
 */
export const requestSourceChangesForWorkflow = asyncHandler(async (req, res) => {
    const { reason } = req.body;

    const article = await Article.findById(req.params.id).populate('author');
    if (!article) {
        return notFoundResponse(res, 'Article not found');
    }

    const workflow = ensureArticleWorkflow(article);
    const workflowBeforeSnapshot = captureWorkflowSnapshot(article, workflow);
    if (
        !enforceWorkflowTransition(
            res,
            workflow.sourceReviewState,
            [WORKFLOW_SOURCE_STATES.SUBMITTED],
            'Source changes can only be requested after submission'
        )
    ) {
        return;
    }

    workflow.sourceReviewState = WORKFLOW_SOURCE_STATES.CHANGES_REQUESTED;
    workflow.translationState = WORKFLOW_TRANSLATION_STATES.NOT_REQUIRED;
    workflow.adminApprovalState = WORKFLOW_ADMIN_STATES.NOT_READY;
    workflow.assignedTranslator = null;
    workflow.timestamps.sourceReviewedAt = new Date();
    workflow.reviewedBy.sourceReviewer = req.user._id;
    workflow.sourceReviewNotes = reason;
    workflow.translationReviewNotes = '';
    workflow.adminReviewNotes = '';

    article.status = 'rejected';
    article.reviewedBy = req.user._id;
    article.reviewedAt = new Date();
    article.rejectionReason = reason;
    article.reviewNotes = reason;
    appendWorkflowAuditEntry({
        article,
        workflow,
        action: 'source_changes_requested',
        actor: req.user,
        notes: reason || '',
        metadata: { via: 'workflow_source_changes_requested' },
        beforeSnapshot: workflowBeforeSnapshot,
    });
    article.markModified('workflow');
    await article.save();

    try {
        const { default: notificationService } = await import('../services/notificationService.js');
        await notificationService.notifyArticleRejected(article, article.author._id, reason);
    } catch (error) {
        console.error('Failed to send source changes-requested notification:', error);
    }

    return successResponse(res, { article }, 'Source changes requested');
});

/**
 * Workflow: Translation submit by translator/writer
 * POST /api/articles/:id/workflow/translation-submit
 */
export const submitTranslationForWorkflow = asyncHandler(async (req, res) => {
    const language = normalizeArticleLanguage(req.body.language);
    if (!language) {
        return badRequestResponse(res, 'Valid translation language is required');
    }

    const article = await Article.findById(req.params.id);
    if (!article) {
        return notFoundResponse(res, 'Article not found');
    }

    const workflow = ensureArticleWorkflow(article);
    const workflowBeforeSnapshot = captureWorkflowSnapshot(article, workflow);
    if (
        !enforceWorkflowTransition(
            res,
            workflow.sourceReviewState,
            [WORKFLOW_SOURCE_STATES.APPROVED],
            'Translation submission requires source approval'
        )
    ) {
        return;
    }

    if (
        !enforceWorkflowTransition(
            res,
            workflow.translationState,
            [WORKFLOW_TRANSLATION_STATES.IN_TRANSLATION, WORKFLOW_TRANSLATION_STATES.CHANGES_REQUESTED],
            'Translation cannot be submitted from this state'
        )
    ) {
        return;
    }

    if (req.user.role === 'writer') {
        const articleAuthorId =
            article.author?._id?.toString?.() ||
            article.author?.toString?.() ||
            article.author;
        const isOwner = articleAuthorId && articleAuthorId.toString() === req.user._id.toString();
        const isAssignedWriter =
            (workflow.assignedTranslator?._id?.toString?.() || workflow.assignedTranslator?.toString?.() || workflow.assignedTranslator) ===
            req.user._id.toString();
        if (!isOwner && !isAssignedWriter) {
            return forbiddenResponse(res, 'Writers can only submit translation for their own articles');
        }
    }

    if (workflow.assignedTranslator && workflow.assignedTranslator.toString() !== req.user._id.toString()) {
        return forbiddenResponse(res, 'This article is assigned to another translator');
    }
    if (!workflow.assignedTranslator) {
        workflow.assignedTranslator = req.user._id;
    }

    const translation = await ArticleTranslation.getByArticleAndLanguage(article._id, language);
    if (!translation) {
        return badRequestResponse(res, `No translation draft found for language "${language}"`);
    }

    const now = new Date();
    const translationWorkflow = ensureTranslationWorkflow(translation);
    translationWorkflow.translationState = 'submitted';
    translationWorkflow.timestamps.submittedAt = now;
    translationWorkflow.timestamps.reviewedAt = null;
    translationWorkflow.reviewedBy.submittedBy = req.user._id;
    translationWorkflow.reviewedBy.reviewer = null;
    translationWorkflow.reviewNotes = '';
    translation.translatedBy = req.user._id;
    translation.translationStatus = 'review';
    translation.lastReviewedAt = null;
    translation.reviewedBy = null;
    translation.markModified('workflow');
    await translation.save();

    workflow.translationState = WORKFLOW_TRANSLATION_STATES.SUBMITTED;
    workflow.adminApprovalState = WORKFLOW_ADMIN_STATES.NOT_READY;
    workflow.timestamps.translationSubmittedAt = now;
    workflow.timestamps.translationReviewedAt = null;
    workflow.reviewedBy.translationReviewer = null;
    workflow.translationReviewNotes = '';
    article.status = 'pending';
    appendWorkflowAuditEntry({
        article,
        workflow,
        action: 'translation_submitted_for_editor_review',
        actor: req.user,
        notes: '',
        metadata: {
            via: 'workflow_translation_submit',
            language,
        },
        beforeSnapshot: workflowBeforeSnapshot,
    });
    article.markModified('workflow');
    await article.save();

    try {
        const { default: notificationService } = await import('../services/notificationService.js');
        const editors = await User.find({ role: 'editor' }).select('_id');
        await notificationService.notifyTranslationSubmitted(article, editors.map((editor) => editor._id), language);
    } catch (error) {
        console.error('Failed to send editor translation-review notification after translation submit:', error);
    }

    sendTelegramWorkflowUpdate({
        targetRole: 'editor',
        stage: 'TRANSLATION SUBMITTED',
        article,
        language,
        submittedBy: buildWorkflowActorName(req.user, 'Translator'),
    });

    return successResponse(res, { article, translation }, 'Translation submitted for editor review');
});

/**
 * Workflow: Translation approve by editor
 * PUT /api/articles/:id/workflow/translation-approve
 */
export const approveTranslationForWorkflow = asyncHandler(async (req, res) => {
    const { notes = '' } = req.body;
    const language = normalizeArticleLanguage(req.body.language);
    if (!language) {
        return badRequestResponse(res, 'Valid translation language is required');
    }

    const article = await Article.findById(req.params.id).populate('author');
    if (!article) {
        return notFoundResponse(res, 'Article not found');
    }

    const workflow = ensureArticleWorkflow(article);
    const workflowBeforeSnapshot = captureWorkflowSnapshot(article, workflow);
    if (
        !enforceWorkflowTransition(
            res,
            workflow.sourceReviewState,
            [WORKFLOW_SOURCE_STATES.APPROVED],
            'Translation approval requires source approval'
        )
    ) {
        return;
    }

    if (
        !enforceWorkflowTransition(
            res,
            workflow.translationState,
            [WORKFLOW_TRANSLATION_STATES.SUBMITTED],
            'Translation approval requires submitted translation'
        )
    ) {
        return;
    }

    const translation = await ArticleTranslation.getByArticleAndLanguage(article._id, language);
    if (!translation) {
        return badRequestResponse(res, `No translation found for language "${language}"`);
    }

    const translationWorkflow = ensureTranslationWorkflow(translation);
    if (
        !enforceWorkflowTransition(
            res,
            translationWorkflow.translationState,
            ['submitted'],
            'Selected translation is not in submitted state'
        )
    ) {
        return;
    }

    translationWorkflow.translationState = 'approved';
    translationWorkflow.timestamps.reviewedAt = new Date();
    translationWorkflow.reviewedBy.reviewer = req.user._id;
    translationWorkflow.reviewNotes = notes || '';
    translation.translationStatus = 'published';
    translation.lastReviewedAt = new Date();
    translation.reviewedBy = req.user._id;
    translation.markModified('workflow');
    await translation.save();

    workflow.translationState = WORKFLOW_TRANSLATION_STATES.APPROVED;
    workflow.adminApprovalState = WORKFLOW_ADMIN_STATES.PENDING_FINAL_REVIEW;
    workflow.timestamps.translationReviewedAt = new Date();
    workflow.reviewedBy.translationReviewer = req.user._id;
    workflow.translationReviewNotes = notes || '';
    article.status = 'pending';
    appendWorkflowAuditEntry({
        article,
        workflow,
        action: 'translation_approved',
        actor: req.user,
        notes: notes || '',
        metadata: {
            via: 'workflow_translation_approve',
            language,
        },
        beforeSnapshot: workflowBeforeSnapshot,
    });
    article.markModified('workflow');
    await article.save();

    try {
        const admins = await User.find({ role: 'admin' }).select('_id');
        const { default: notificationService } = await import('../services/notificationService.js');
        await notificationService.notifyAdminReviewPending(article, admins.map((admin) => admin._id));
    } catch (error) {
        console.error('Failed to notify admins for final review:', error);
    }

    sendTelegramWorkflowUpdate({
        targetRole: 'admin',
        stage: 'ADMIN REVIEW PENDING',
        article,
        language,
        submittedBy: buildWorkflowActorName(req.user, 'Editor'),
    });

    return successResponse(res, { article, translation }, 'Translation approved and moved to admin final review');
});

/**
 * Workflow: Translation changes requested by editor
 * PUT /api/articles/:id/workflow/translation-request-changes
 */
export const requestTranslationChangesForWorkflow = asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const language = normalizeArticleLanguage(req.body.language);
    if (!language) {
        return badRequestResponse(res, 'Valid translation language is required');
    }

    const article = await Article.findById(req.params.id);
    if (!article) {
        return notFoundResponse(res, 'Article not found');
    }

    const workflow = ensureArticleWorkflow(article);
    const workflowBeforeSnapshot = captureWorkflowSnapshot(article, workflow);
    if (
        !enforceWorkflowTransition(
            res,
            workflow.translationState,
            [WORKFLOW_TRANSLATION_STATES.SUBMITTED],
            'Translation changes can only be requested for submitted translation'
        )
    ) {
        return;
    }

    const translation = await ArticleTranslation.getByArticleAndLanguage(article._id, language);
    if (!translation) {
        return badRequestResponse(res, `No translation found for language "${language}"`);
    }

    const translationWorkflow = ensureTranslationWorkflow(translation);
    translationWorkflow.translationState = 'changes_requested';
    translationWorkflow.timestamps.reviewedAt = new Date();
    translationWorkflow.reviewedBy.reviewer = req.user._id;
    translationWorkflow.reviewNotes = reason;
    translation.translationStatus = 'in_progress';
    translation.markModified('workflow');
    await translation.save();

    workflow.translationState = WORKFLOW_TRANSLATION_STATES.CHANGES_REQUESTED;
    workflow.adminApprovalState = WORKFLOW_ADMIN_STATES.NOT_READY;
    workflow.timestamps.translationReviewedAt = new Date();
    workflow.reviewedBy.translationReviewer = req.user._id;
    workflow.translationReviewNotes = reason;
    article.status = 'pending';
    appendWorkflowAuditEntry({
        article,
        workflow,
        action: 'translation_changes_requested',
        actor: req.user,
        notes: reason || '',
        metadata: {
            via: 'workflow_translation_changes_requested',
            language,
        },
        beforeSnapshot: workflowBeforeSnapshot,
    });
    article.markModified('workflow');
    await article.save();

    const targetTranslatorId = workflow.assignedTranslator || translation.translatedBy;
    if (targetTranslatorId) {
        try {
            const { default: notificationService } = await import('../services/notificationService.js');
            await notificationService.notify({
                recipientId: targetTranslatorId,
                type: 'system_announcement',
                title: 'Translation Needs Changes',
                message: `"${article.title}" translation needs updates: ${reason}`,
                link: `/dashboard/articles/${article._id}/edit`,
                relatedArticle: article._id,
                priority: 'high',
            });
        } catch (error) {
            console.error('Failed to notify translator for changes:', error);
        }
    }

    return successResponse(res, { article, translation }, 'Translation changes requested');
});

/**
 * Workflow: Final approve by admin
 * PUT /api/articles/:id/workflow/final-approve
 */
export const finalApproveForWorkflow = asyncHandler(async (req, res) => {
    const { notes = '' } = req.body;

    const article = await Article.findById(req.params.id).populate('author');
    if (!article) {
        return notFoundResponse(res, 'Article not found');
    }

    const workflow = ensureArticleWorkflow(article);
    const workflowBeforeSnapshot = captureWorkflowSnapshot(article, workflow);
    if (
        !enforceWorkflowTransition(
            res,
            workflow.sourceReviewState,
            [WORKFLOW_SOURCE_STATES.APPROVED],
            'Final approval requires source approval'
        )
    ) {
        return;
    }
    if (
        !enforceWorkflowTransition(
            res,
            workflow.translationState,
            [WORKFLOW_TRANSLATION_STATES.APPROVED],
            'Final approval requires editor-approved translation'
        )
    ) {
        return;
    }
    if (
        !enforceWorkflowTransition(
            res,
            workflow.adminApprovalState,
            [WORKFLOW_ADMIN_STATES.PENDING_FINAL_REVIEW],
            'Final approval requires admin-final-review state'
        )
    ) {
        return;
    }

    workflow.adminApprovalState = WORKFLOW_ADMIN_STATES.APPROVED;
    workflow.timestamps.adminReviewedAt = new Date();
    workflow.reviewedBy.adminReviewer = req.user._id;
    workflow.adminReviewNotes = notes || '';

    article.status = 'published';
    article.publishedAt = article.publishedAt || new Date();
    article.reviewedBy = req.user._id;
    article.reviewedAt = new Date();
    article.reviewNotes = notes || '';
    article.rejectionReason = '';
    appendWorkflowAuditEntry({
        article,
        workflow,
        action: 'final_published',
        actor: req.user,
        notes: notes || '',
        metadata: { via: 'workflow_final_approve' },
        beforeSnapshot: workflowBeforeSnapshot,
    });
    article.markModified('workflow');
    await article.save();

    await Category.findById(article.category).then((cat) => cat?.updateArticleCount());

    try {
        const { default: notificationService } = await import('../services/notificationService.js');
        await notificationService.notifyArticlePublished(article, article.author._id);
    } catch (error) {
        console.error('Failed to send final approval notifications:', error);
    }

    const publishedBy = buildWorkflowActorName(req.user, 'Admin');
    sendTelegramWorkflowUpdate({
        targetRole: 'editor',
        stage: 'PUBLISHED',
        article,
        submittedBy: publishedBy,
    });
    sendTelegramWorkflowUpdate({
        targetRole: 'translator',
        stage: 'PUBLISHED',
        article,
        submittedBy: publishedBy,
    });
    sendTelegramWorkflowUpdate({
        targetRole: 'admin',
        stage: 'PUBLISHED',
        article,
        submittedBy: publishedBy,
    });

    return successResponse(res, { article }, 'Article finalized and published');
});

/**
 * Workflow: Final reject by admin
 * PUT /api/articles/:id/workflow/final-reject
 */
export const finalRejectForWorkflow = asyncHandler(async (req, res) => {
    const { reason } = req.body;

    const article = await Article.findById(req.params.id).populate('author');
    if (!article) {
        return notFoundResponse(res, 'Article not found');
    }

    const workflow = ensureArticleWorkflow(article);
    const workflowBeforeSnapshot = captureWorkflowSnapshot(article, workflow);
    if (
        !enforceWorkflowTransition(
            res,
            workflow.adminApprovalState,
            [WORKFLOW_ADMIN_STATES.PENDING_FINAL_REVIEW],
            'Final rejection requires admin-final-review state'
        )
    ) {
        return;
    }

    workflow.adminApprovalState = WORKFLOW_ADMIN_STATES.REJECTED;
    workflow.sourceReviewState = WORKFLOW_SOURCE_STATES.CHANGES_REQUESTED;
    workflow.translationState = WORKFLOW_TRANSLATION_STATES.CHANGES_REQUESTED;
    workflow.timestamps.adminReviewedAt = new Date();
    workflow.reviewedBy.adminReviewer = req.user._id;
    workflow.adminReviewNotes = reason;

    article.status = 'rejected';
    article.reviewedBy = req.user._id;
    article.reviewedAt = new Date();
   article.rejectionReason = reason;
    article.reviewNotes = reason;
    appendWorkflowAuditEntry({
        article,
        workflow,
        action: 'final_rejected',
        actor: req.user,
        notes: reason || '',
        metadata: { via: 'workflow_final_reject' },
        beforeSnapshot: workflowBeforeSnapshot,
    });
    article.markModified('workflow');
    await article.save();

    try {
        const { default: notificationService } = await import('../services/notificationService.js');
        await notificationService.notifyArticleRejected(article, article.author._id, reason);
    } catch (error) {
        console.error('Failed to send final rejection notification:', error);
    }

    return successResponse(res, { article }, 'Article rejected at final admin review');
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
    getEditorWorkflowQueue,
    getTranslatorWorkflowQueue,
    getAdminWorkflowQueue,
    approveArticle,
    rejectArticle,
    submitSourceForWorkflow,
    approveSourceForWorkflow,
    requestSourceChangesForWorkflow,
    submitTranslationForWorkflow,
    approveTranslationForWorkflow,
    requestTranslationChangesForWorkflow,
    finalApproveForWorkflow,
    finalRejectForWorkflow,
    recordView,
    getRelatedArticles,
    searchArticles,
    getArticlesByCategory,
    getArticleInsights,
};
