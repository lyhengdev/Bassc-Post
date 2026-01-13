import { Router } from 'express';
import articleController from '../controllers/articleController.js';
import { authenticate, optionalAuth, isWriter, isEditor, isAdmin } from '../middleware/auth.js';
import { validate, validateObjectId } from '../middleware/validation.js';
import {
  createArticleValidator,
  updateArticleValidator,
  listArticlesValidator,
  searchArticlesValidator,
  approveArticleValidator,
  rejectArticleValidator,
} from '../validators/articleValidator.js';

const router = Router();

// Public routes
router.get('/', listArticlesValidator, validate, articleController.getArticles);
router.get('/featured', articleController.getFeaturedArticles);
router.get('/latest', articleController.getLatestArticles);
router.get('/search', searchArticlesValidator, validate, articleController.searchArticles);
router.get('/category/:slug', articleController.getArticlesByCategory);
router.get('/slug/:slug', optionalAuth, articleController.getArticleBySlug);
router.post('/:id/view', validateObjectId(), articleController.recordView);
router.get('/:id/related', validateObjectId(), articleController.getRelatedArticles);

// Protected routes - Writers
router.use(authenticate);

router.get('/my', isWriter, articleController.getMyArticles);
router.post('/', isWriter, createArticleValidator, validate, articleController.createArticle);
router.get('/id/:id', validateObjectId('id'), articleController.getArticleById);
router.put('/:id', validateObjectId(), updateArticleValidator, validate, articleController.updateArticle);
router.delete('/:id', validateObjectId(), articleController.deleteArticle);

// Protected routes - Editors
router.get('/pending', isEditor, articleController.getPendingArticles);
router.put('/:id/approve', isEditor, validateObjectId(), approveArticleValidator, validate, articleController.approveArticle);
router.put('/:id/reject', isEditor, validateObjectId(), rejectArticleValidator, validate, articleController.rejectArticle);

export default router;
