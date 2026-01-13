import express from 'express';
import {
  getAllAds,
  getAd,
  createAd,
  updateAd,
  deleteAd,
  duplicateAd,
  selectAds,
  getHomepageAds,
  getArticleAds,
  trackEvent,
  getAdStats,
  getAllAdsStats,
  bulkUpdateStatus
} from '../controllers/adsController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// ==================== PUBLIC ROUTES ====================
// Ad selection for public pages (no auth required)
router.get('/select', selectAds);
router.get('/homepage', getHomepageAds);
router.get('/article/:articleId', getArticleAds);

// Event tracking (impressions/clicks)
router.post('/event', trackEvent);

// ==================== ADMIN ROUTES ====================
// All routes below require authentication

// Stats summary (admin)
router.get('/stats/summary', authenticate, authorize('admin', 'editor'), getAllAdsStats);

// Bulk operations
router.patch('/bulk/status', authenticate, authorize('admin', 'editor'), bulkUpdateStatus);

// Individual ad stats
router.get('/:id/stats', authenticate, authorize('admin', 'editor'), getAdStats);

// Duplicate ad
router.post('/:id/duplicate', authenticate, authorize('admin', 'editor'), duplicateAd);

// CRUD operations
router.route('/')
  .get(authenticate, authorize('admin', 'editor'), getAllAds)
  .post(authenticate, authorize('admin', 'editor'), createAd);

router.route('/:id')
  .get(authenticate, authorize('admin', 'editor'), getAd)
  .put(authenticate, authorize('admin', 'editor'), updateAd)
  .delete(authenticate, authorize('admin'), deleteAd);

export default router;
