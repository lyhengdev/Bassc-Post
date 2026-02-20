import express from 'express';
import {
  getArticleTranslations,
  getArticleTranslation,
  createArticleTranslation,
  updateArticleTranslation,
  deleteArticleTranslation,
  publishArticleTranslation,
  getCategoryTranslations,
  getCategoryTranslation,
  createCategoryTranslation,
  updateCategoryTranslation,
  deleteCategoryTranslation,
  publishCategoryTranslation,
  getSupportedLanguages,
} from '../controllers/translationController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// ==================== SUPPORTED LANGUAGES ====================

// Get all supported languages (public)
router.get('/languages', getSupportedLanguages);

// ==================== ARTICLE TRANSLATIONS ====================

// Get all translations for an article
router.get('/articles/:articleId', getArticleTranslations);

// Get specific article translation
router.get('/articles/:articleId/:language', getArticleTranslation);

// Create article translation (admin/editor only)
router.post(
  '/articles/:articleId',
  authenticate,
  authorize(['admin', 'editor']),
  createArticleTranslation
);

// Update article translation (admin/editor only)
router.put(
  '/articles/:articleId/:language',
  authenticate,
  authorize(['admin', 'editor']),
  updateArticleTranslation
);

// Delete article translation (admin only)
router.delete(
  '/articles/:articleId/:language',
  authenticate,
  authorize(['admin']),
  deleteArticleTranslation
);

// Publish article translation (admin/editor only)
router.post(
  '/articles/:articleId/:language/publish',
  authenticate,
  authorize(['admin', 'editor']),
  publishArticleTranslation
);

// ==================== CATEGORY TRANSLATIONS ====================

// Get all translations for a category
router.get('/categories/:categoryId', getCategoryTranslations);

// Get specific category translation
router.get('/categories/:categoryId/:language', getCategoryTranslation);

// Create category translation (admin only)
router.post(
  '/categories/:categoryId',
  authenticate,
  authorize(['admin']),
  createCategoryTranslation
);

// Update category translation (admin only)
router.put(
  '/categories/:categoryId/:language',
  authenticate,
  authorize(['admin']),
  updateCategoryTranslation
);

// Delete category translation (admin only)
router.delete(
  '/categories/:categoryId/:language',
  authenticate,
  authorize(['admin']),
  deleteCategoryTranslation
);

// Publish category translation (admin only)
router.post(
  '/categories/:categoryId/:language/publish',
  authenticate,
  authorize(['admin']),
  publishCategoryTranslation
);

export default router;
