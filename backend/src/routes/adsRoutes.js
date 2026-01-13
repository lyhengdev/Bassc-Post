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
import { protect, adminOnly, authorize } from '../middleware/auth.js';

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
router.get('/stats/summary', protect, authorize('admin', 'editor'), getAllAdsStats);

// Bulk operations
router.patch('/bulk/status', protect, authorize('admin', 'editor'), bulkUpdateStatus);

// Individual ad stats
router.get('/:id/stats', protect, authorize('admin', 'editor'), getAdStats);

// Duplicate ad
router.post('/:id/duplicate', protect, authorize('admin', 'editor'), duplicateAd);

// CRUD operations
router.route('/')
  .get(protect, authorize('admin', 'editor'), getAllAds)
  .post(protect, authorize('admin', 'editor'), createAd);

router.route('/:id')
  .get(protect, authorize('admin', 'editor'), getAd)
  .put(protect, authorize('admin', 'editor'), updateAd)
  .delete(protect, authorize('admin'), deleteAd);

export default router;
