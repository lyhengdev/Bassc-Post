import { Router } from 'express';
import analyticsController from '../controllers/analyticsController.js';
import { authenticate, isAdmin, isEditor } from '../middleware/auth.js';

const router = Router();

// Dashboard summary (all authenticated users)
router.get('/dashboard', authenticate, analyticsController.getDashboardSummary);

// Admin analytics
router.use(authenticate, isAdmin);

router.get('/', analyticsController.getViewsAnalytics);
router.get('/views', analyticsController.getViewsAnalytics);
router.get('/articles', analyticsController.getArticlesAnalytics);
router.get('/users', analyticsController.getUsersAnalytics);
router.get('/ai', analyticsController.getAIAnalytics);

export default router;