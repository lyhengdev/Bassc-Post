import { Router } from 'express';
import articleController from '../controllers/articleController.js';
import { authenticate, optionalAuth, isEditor, isAdmin, isContentStaff, authorize } from '../middleware/auth.js';
import { validate, validateObjectId } from '../middleware/validation.js';
import {
  createArticleValidator,
  updateArticleValidator,
  listArticlesValidator,
  searchArticlesValidator,
  approveArticleValidator,
  rejectArticleValidator,
  submitSourceWorkflowValidator,
  approveSourceWorkflowValidator,
  requestSourceChangesWorkflowValidator,
  submitTranslationWorkflowValidator,
  approveTranslationWorkflowValidator,
  requestTranslationChangesWorkflowValidator,
  finalApproveWorkflowValidator,
  finalRejectWorkflowValidator,
} from '../validators/articleValidator.js';

const router = Router();

// Public routes
router.get('/', listArticlesValidator, validate, articleController.getArticles);
router.get('/featured', articleController.getFeaturedArticles);
router.get('/latest', articleController.getLatestArticles);
router.get('/search', searchArticlesValidator, validate, articleController.searchArticles);
router.get('/category/:slug', articleController.getArticlesByCategory);
router.get('/resolve/:slug', optionalAuth, articleController.resolveArticleBySlug);
router.get('/slug/:slug', optionalAuth, articleController.getArticleBySlug);
router.post('/:id/view', validateObjectId(), articleController.recordView);
router.get('/:id/related', validateObjectId(), articleController.getRelatedArticles);

// Protected routes - Writers
router.use(authenticate);

router.get('/my', isContentStaff, articleController.getMyArticles);
router.get('/admin', isAdmin, articleController.getAllArticlesAdmin);
router.get('/workflow/editor-queue', authorize(['editor', 'admin']), articleController.getEditorWorkflowQueue);
router.get('/workflow/translator-queue', authorize(['translator', 'writer']), articleController.getTranslatorWorkflowQueue);
router.get('/workflow/admin-queue', authorize('admin'), articleController.getAdminWorkflowQueue);
router.get('/:id/insights', isContentStaff, validateObjectId(), articleController.getArticleInsights);
router.post('/', isContentStaff, createArticleValidator, validate, articleController.createArticle);
router.get('/id/:id', validateObjectId('id'), articleController.getArticleById);

// Workflow routes
router.post(
  '/:id/workflow/source-submit',
  authorize(['writer', 'editor', 'translator', 'admin']),
  submitSourceWorkflowValidator,
  validate,
  articleController.submitSourceForWorkflow
);
router.put(
  '/:id/workflow/source-approve',
  authorize('editor'),
  approveSourceWorkflowValidator,
  validate,
  articleController.approveSourceForWorkflow
);
router.put(
  '/:id/workflow/source-request-changes',
  authorize('editor'),
  requestSourceChangesWorkflowValidator,
  validate,
  articleController.requestSourceChangesForWorkflow
);
router.post(
  '/:id/workflow/translation-submit',
  authorize(['translator', 'writer']),
  submitTranslationWorkflowValidator,
  validate,
  articleController.submitTranslationForWorkflow
);
router.put(
  '/:id/workflow/translation-approve',
  authorize('editor'),
  approveTranslationWorkflowValidator,
  validate,
  articleController.approveTranslationForWorkflow
);
router.put(
  '/:id/workflow/translation-request-changes',
  authorize('editor'),
  requestTranslationChangesWorkflowValidator,
  validate,
  articleController.requestTranslationChangesForWorkflow
);
router.put(
  '/:id/workflow/final-approve',
  authorize('admin'),
  finalApproveWorkflowValidator,
  validate,
  articleController.finalApproveForWorkflow
);
router.put(
  '/:id/workflow/final-reject',
  authorize('admin'),
  finalRejectWorkflowValidator,
  validate,
  articleController.finalRejectForWorkflow
);

router.put('/:id', validateObjectId(), updateArticleValidator, validate, articleController.updateArticle);
router.delete('/:id', validateObjectId(), articleController.deleteArticle);

// Protected routes - Editors
router.get('/pending', isEditor, articleController.getPendingArticles);
router.put('/:id/approve', isEditor, validateObjectId(), approveArticleValidator, validate, articleController.approveArticle);
router.put('/:id/reject', isEditor, validateObjectId(), rejectArticleValidator, validate, articleController.rejectArticle);

export default router;
