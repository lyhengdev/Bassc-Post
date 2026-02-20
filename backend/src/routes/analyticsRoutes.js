import { Router } from 'express';
import analyticsController from '../controllers/analyticsController.js';
import { authenticate, isAdmin, isEditor } from '../middleware/auth.js';

const router = Router();

// Dashboard summary (all authenticated users)
router.get('/dashboard', authenticate, analyticsController.getDashboardSummary);
router.get('/summary', authenticate, analyticsController.getDashboardSummary);

// Admin-only analytics endpoints
router.get('/views', authenticate, isAdmin, analyticsController.getViewsAnalytics);
router.get('/articles', authenticate, isAdmin, analyticsController.getArticlesAnalytics);
router.get('/users', authenticate, isAdmin, analyticsController.getUsersAnalytics);
router.get('/ai', authenticate, isAdmin, analyticsController.getAIAnalytics);
router.get('/ads', authenticate, isAdmin, analyticsController.getAdsAnalytics);

// Root endpoint (defaults to dashboard summary for non-admins, views for admins)
router.get('/', authenticate, (req, res, next) => {
  // If admin, show views analytics, otherwise show dashboard summary
  if (req.user && req.user.role === 'admin') {
    return analyticsController.getViewsAnalytics(req, res, next);
  }
  return analyticsController.getDashboardSummary(req, res, next);
});

export default router;
