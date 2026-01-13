import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getAllPages,
  getPublishedPages,
  getPageBySlug,
  getPageById,
  createPage,
  updatePage,
  deletePage,
  duplicatePage,
  getMenuPages
} from '../controllers/pageController.js';

const router = Router();

// Public routes
router.get('/published', getPublishedPages);
router.get('/menu', getMenuPages);
router.get('/slug/:slug', getPageBySlug);

// Admin routes
router.get('/', authenticate, authorize('admin', 'editor'), getAllPages);
router.get('/:id', authenticate, authorize('admin', 'editor'), getPageById);
router.post('/', authenticate, authorize('admin', 'editor'), createPage);
router.put('/:id', authenticate, authorize('admin', 'editor'), updatePage);
router.delete('/:id', authenticate, authorize('admin'), deletePage);
router.post('/:id/duplicate', authenticate, authorize('admin', 'editor'), duplicatePage);

export default router;
