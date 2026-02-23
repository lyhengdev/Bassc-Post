import { Router } from 'express';
import { authenticate, optionalAuth, isEditor } from '../middleware/auth.js';
import { validateObjectId } from '../middleware/validation.js';
import {
  getArticleComments,
  createComment,
  updateComment,
  deleteComment,
  toggleLike,
  getAllComments,
  moderateComment,
  bulkModerate,
} from '../controllers/commentController.js';

const router = Router();

// Article comments routes - use optionalAuth so we can show user's pending comments
router.get('/articles/:articleId/comments', optionalAuth, validateObjectId('articleId'), getArticleComments);
router.post('/articles/:articleId/comments', optionalAuth, validateObjectId('articleId'), createComment);

// Individual comment routes
router.put('/comments/:id', authenticate, validateObjectId(), updateComment);
router.delete('/comments/:id', authenticate, validateObjectId(), deleteComment);
router.post('/comments/:id/like', authenticate, validateObjectId(), toggleLike);

// Admin/Moderation routes
router.get('/comments', authenticate, isEditor, getAllComments);
router.put('/comments/:id/moderate', authenticate, isEditor, validateObjectId(), moderateComment);
router.post('/comments/bulk-moderate', authenticate, isEditor, bulkModerate);

export default router;
