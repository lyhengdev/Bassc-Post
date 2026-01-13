import { Router } from 'express';
import categoryController from '../controllers/categoryController.js';
import { authenticate, isAdmin } from '../middleware/auth.js';
import { validate, validateObjectId } from '../middleware/validation.js';
import {
  createCategoryValidator,
  updateCategoryValidator,
} from '../validators/categoryValidator.js';

const router = Router();

// Public routes
router.get('/', categoryController.getCategories);
router.get('/slug/:slug', categoryController.getCategoryBySlug);

// Protected routes - Admin only
router.use(authenticate, isAdmin);

router.get('/stats', categoryController.getCategoryStats);
router.post('/', createCategoryValidator, validate, categoryController.createCategory);
router.get('/id/:id', validateObjectId('id'), categoryController.getCategoryById);
router.put('/reorder', categoryController.reorderCategories);
router.put('/:id', validateObjectId(), updateCategoryValidator, validate, categoryController.updateCategory);
router.delete('/:id', validateObjectId(), categoryController.deleteCategory);

export default router;
