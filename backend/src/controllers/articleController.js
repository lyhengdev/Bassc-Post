import {Article, Category, User} from '../models/index.js';
import {analyticsHelpers} from '../models/Analytics.js';
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

/**
 * Create article
 * POST /api/articles
 */
export const createArticle = asyncHandler(async (req, res) => {
    const {title, content, excerpt, category, tags, metaTitle, metaDescription, featuredImage, status, isFeatured, isBreaking} = req.body;

    // Verify category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
        return badRequestResponse(res, 'Category not found');
    }

    // Sanitize content
    const sanitizedContent = sanitizeEditorContent(content);

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
        author: req.user._id,
        status: articleStatus,
        publishedAt,
        isFeatured: isFeatured || false,
        isBreaking: isBreaking || false,
    });

    await article.populate('author', 'firstName lastName avatar');
    await article.populate('category', 'name slug color');

    // Invalidate article list caches
    await cacheService.invalidateArticleLists();

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
    const {category, tag, sortBy = 'publishedAt', sortOrder = 'desc', isBreaking, isFeatured} = req.query;

    // Create cache key from query params
    const cacheKey = `list:${page}:${limit}:${category || ''}:${tag || ''}:${sortBy}:${sortOrder}:${isBreaking || ''}:${isFeatured || ''}`;
    
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

    // Cache the result
    const pagination = {page, limit, total};
    await cacheService.setArticleList(cacheKey, {articles, pagination}, config.cache.listTTL);

    return paginatedResponse(res, articles, pagination);
});

/**
 * Get featured articles - WITH CACHING
 * GET /api/articles/featured
 */
export const getFeaturedArticles = asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 5, 10);

    // Try cache first
    const cacheKey = `featured:${limit}`;
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

    // Cache for 5 minutes
    await cacheService.setArticleList(cacheKey, articles, config.cache.featuredTTL);

    return successResponse(res, {articles});
});

/**
 * Get latest articles - WITH CACHING
 * GET /api/articles/latest
 */
export const getLatestArticles = asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 20);

    // Try cache first
    const cacheKey = `latest:${limit}`;
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

    // Cache for 3 minutes
    await cacheService.setArticleList(cacheKey, articles, config.cache.listTTL);

    return successResponse(res, {articles});
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
        featuredImagePositionY, featuredImageAlt, status, isFeatured, isBreaking
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

    // Featured and breaking flags - only admin/editor can change
    if (isAdminOrEditor) {
        if (isFeatured !== undefined) article.isFeatured = isFeatured;
        if (isBreaking !== undefined) article.isBreaking = isBreaking;
    }

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

    // Invalidate caches
    await cacheService.invalidateArticle(oldSlug);
    if (article.slug !== oldSlug) {
        await cacheService.invalidateArticle(article.slug);
    }
    await cacheService.invalidateArticleLists();

    await article.populate('author', 'firstName lastName avatar');
    await article.populate('category', 'name slug color');

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

    const isOwner = article.author.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
        return forbiddenResponse(res, 'You do not have permission to delete this article');
    }

    const slug = article.slug;
    await article.deleteOne();

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
    const {status, sortBy = 'createdAt', sortOrder = 'desc'} = req.query;

    const filter = {author: req.user._id};
    if (status) filter.status = status;

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

    return paginatedResponse(res, articles, {page, limit, total});
});

/**
 * Get pending articles (editor)
 * GET /api/articles/pending
 */
export const getPendingArticles = asyncHandler(async (req, res) => {
    const {page, limit, skip} = parsePaginationParams(req.query);

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

    return paginatedResponse(res, articles, {page, limit, total});
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

    const articles = await Article.findRelated(req.params.id, limit);

    return successResponse(res, {articles});
});

/**
 * Search articles
 * GET /api/articles/search
 */
export const searchArticles = asyncHandler(async (req, res) => {
    const {q} = req.query;
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
            .select('-content'),
        Article.countDocuments(filter),
    ]);

    return paginatedResponse(res, articles, {page, limit, total});
});

/**
 * Get articles by category
 * GET /api/articles/category/:slug
 */
export const getArticlesByCategory = asyncHandler(async (req, res) => {
    const {slug} = req.params;
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
            .select('-content'),
        Article.countDocuments(filter),
    ]);

    // Return category in data, articles for pagination wrapper
    return successResponse(res, {
        category,
        articles,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
    });
});

export default {
    createArticle,
    getArticles,
    getFeaturedArticles,
    getLatestArticles,
    getArticleBySlug,
    getArticleById,
    updateArticle,
    deleteArticle,
    getMyArticles,
    getPendingArticles,
    approveArticle,
    rejectArticle,
    recordView,
    getRelatedArticles,
    searchArticles,
    getArticlesByCategory,
};
