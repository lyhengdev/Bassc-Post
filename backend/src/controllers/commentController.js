import Comment from '../models/Comment.js';
import Article from '../models/Article.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { successResponse, notFoundResponse, badRequestResponse, forbiddenResponse } from '../utils/apiResponse.js';
import notificationService from '../services/notificationService.js';

/**
 * Get comments for an article
 * GET /api/articles/:articleId/comments
 * Shows approved comments + user's own pending comments
 */
export const getArticleComments = asyncHandler(async (req, res) => {
  const { articleId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  
  const article = await Article.findById(articleId);
  if (!article) {
    return notFoundResponse(res, 'Article not found');
  }
  
  const skip = (page - 1) * limit;
  
  // Build query - show only approved comments for all users
  const query = {
    article: articleId,
    parent: null,
  };
  query.status = 'approved';
  
  const comments = await Comment.find(query)
    .populate('author', 'firstName lastName avatar')
    .populate({
      path: 'replies',
      match: { status: 'approved' },
      populate: { path: 'author', select: 'firstName lastName avatar' },
      options: { sort: { createdAt: 1 } },
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));
    
  const total = await Comment.countDocuments(query);
  
  return successResponse(res, {
    comments,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * Create a comment
 * POST /api/articles/:articleId/comments
 */
export const createComment = asyncHandler(async (req, res) => {
  const { articleId } = req.params;
  const { content, parentId, guestName, guestEmail } = req.body;
  
  const article = await Article.findById(articleId);
  if (!article) {
    return notFoundResponse(res, 'Article not found');
  }
  
  if (article.status !== 'published') {
    return badRequestResponse(res, 'Cannot comment on unpublished articles');
  }
  
  // Validate parent comment if replying
  if (parentId) {
    const parentComment = await Comment.findById(parentId);
    if (!parentComment) {
      return notFoundResponse(res, 'Parent comment not found');
    }
    if (parentComment.article.toString() !== articleId) {
      return badRequestResponse(res, 'Parent comment belongs to different article');
    }
  }
  
  // Create comment data
  const commentData = {
    article: articleId,
    content,
    parent: parentId || null,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  };
  
  // Authenticated user comment
  if (req.user) {
    commentData.author = req.user._id;
    // Auto-approve comments from any authenticated user
    commentData.status = 'approved';
  } else {
    // Guest comment
    if (!guestName || !guestEmail) {
      return badRequestResponse(res, 'Name and email are required for guest comments');
    }
    commentData.guestName = guestName;
    commentData.guestEmail = guestEmail;
  }
  
  const comment = await Comment.create(commentData);
  await comment.populate('author', 'firstName lastName avatar');
  
  // Send notification to article author (if not the same person)
  try {
    if (article.author && (!req.user || article.author.toString() !== req.user._id.toString())) {
      await notificationService.notifyCommentReceived(article, comment, article.author);
    }
    
    // If this is a reply, notify the parent comment author
    if (parentId) {
      const parentComment = await Comment.findById(parentId).populate('author', '_id');
      if (parentComment?.author && (!req.user || parentComment.author._id.toString() !== req.user._id.toString())) {
        await notificationService.notifyCommentReply(
          { ...parentComment.toObject(), article: { slug: article.slug } },
          comment,
          parentComment.author._id
        );
      }
    }
  } catch (err) {
    console.error('Notification error:', err);
    // Don't fail the request if notification fails
  }
  
  return successResponse(res, { comment }, 'Comment submitted successfully', 201);
});

/**
 * Update a comment
 * PUT /api/comments/:id
 */
export const updateComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  
  const comment = await Comment.findById(id);
  if (!comment) {
    return notFoundResponse(res, 'Comment not found');
  }
  
  // Check ownership
  if (!req.user) {
    return forbiddenResponse(res, 'Authentication required');
  }
  
  const isOwner = comment.author && comment.author.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';
  
  if (!isOwner && !isAdmin) {
    return forbiddenResponse(res, 'You can only edit your own comments');
  }
  
  // Don't allow editing after 15 minutes unless admin
  const editWindow = 15 * 60 * 1000; // 15 minutes
  if (!isAdmin && Date.now() - new Date(comment.createdAt).getTime() > editWindow) {
    return badRequestResponse(res, 'Edit window has expired');
  }
  
  comment.content = content;
  comment.isEdited = true;
  comment.editedAt = new Date();
  await comment.save();
  
  await comment.populate('author', 'firstName lastName avatar');
  
  return successResponse(res, { comment }, 'Comment updated');
});

/**
 * Delete a comment
 * DELETE /api/comments/:id
 */
export const deleteComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const comment = await Comment.findById(id);
  if (!comment) {
    return notFoundResponse(res, 'Comment not found');
  }
  
  // Check ownership
  if (!req.user) {
    return forbiddenResponse(res, 'Authentication required');
  }
  
  const isOwner = comment.author && comment.author.toString() === req.user._id.toString();
  const isAdmin = ['admin', 'editor'].includes(req.user.role);
  
  if (!isOwner && !isAdmin) {
    return forbiddenResponse(res, 'You can only delete your own comments');
  }
  
  // Delete replies too
  await Comment.deleteMany({ parent: id });
  await comment.deleteOne();
  
  return successResponse(res, null, 'Comment deleted');
});

/**
 * Like/unlike a comment
 * POST /api/comments/:id/like
 */
export const toggleLike = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  if (!req.user) {
    return forbiddenResponse(res, 'Authentication required to like comments');
  }
  
  const comment = await Comment.findById(id);
  if (!comment) {
    return notFoundResponse(res, 'Comment not found');
  }
  
  const liked = await comment.toggleLike(req.user._id);
  
  return successResponse(res, { liked, likes: comment.likes });
});

// ==================== ADMIN/MODERATION ROUTES ====================

/**
 * Get all comments (admin)
 * GET /api/comments
 */
export const getAllComments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, articleId } = req.query;
  const skip = (page - 1) * limit;
  
  const filter = {};
  if (status) filter.status = status;
  if (articleId) filter.article = articleId;
  
  const comments = await Comment.find(filter)
    .populate('author', 'firstName lastName avatar email')
    .populate('article', 'title slug')
    .populate('moderatedBy', 'firstName lastName')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));
    
  const total = await Comment.countDocuments(filter);
  
  // Get status counts
  const statusCounts = await Comment.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  
  const counts = {
    pending: 0,
    approved: 0,
    rejected: 0,
    spam: 0,
  };
  statusCounts.forEach(s => { counts[s._id] = s.count; });
  
  return successResponse(res, {
    comments,
    counts,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * Moderate a comment (approve/reject/spam)
 * PUT /api/comments/:id/moderate
 */
export const moderateComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, note } = req.body;
  
  if (!['approved', 'rejected', 'spam'].includes(status)) {
    return badRequestResponse(res, 'Invalid status');
  }
  
  const comment = await Comment.findById(id);
  if (!comment) {
    return notFoundResponse(res, 'Comment not found');
  }
  
  comment.status = status;
  comment.moderatedBy = req.user._id;
  comment.moderatedAt = new Date();
  if (note) comment.moderationNote = note;
  
  await comment.save();
  await comment.populate('author', 'firstName lastName avatar');
  await comment.populate('moderatedBy', 'firstName lastName');
  
  return successResponse(res, { comment }, `Comment ${status}`);
});

/**
 * Bulk moderate comments
 * POST /api/comments/bulk-moderate
 */
export const bulkModerate = asyncHandler(async (req, res) => {
  const { ids, status } = req.body;
  
  if (!Array.isArray(ids) || ids.length === 0) {
    return badRequestResponse(res, 'No comments selected');
  }
  
  if (!['approved', 'rejected', 'spam'].includes(status)) {
    return badRequestResponse(res, 'Invalid status');
  }
  
  await Comment.updateMany(
    { _id: { $in: ids } },
    {
      status,
      moderatedBy: req.user._id,
      moderatedAt: new Date(),
    }
  );
  
  return successResponse(res, null, `${ids.length} comments ${status}`);
});

export default {
  getArticleComments,
  createComment,
  updateComment,
  deleteComment,
  toggleLike,
  getAllComments,
  moderateComment,
  bulkModerate,
};
