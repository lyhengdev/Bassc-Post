import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  getAllCollections,
  getCollection,
  createCollection,
  updateCollection,
  deleteCollection,
  duplicateCollection,
  updateCollectionStats,
  getCollectionAnalytics,
  selectCollection,
  getAds,
  getAd,
  createAd,
  updateAd,
  deleteAd,
  duplicateAd,
  reorderAds,
  getAdAnalytics,
  trackEvent,
  bulkUpdateCollections,
  bulkDeleteCollections,
  bulkUpdateAds,
  bulkDeleteAds,
} from '../controllers/adsControllerComplete.js';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// ✅ FIXED: Rate limiting for public endpoints
const adSelectLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute per IP
  message: { success: false, message: 'Too many ad requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const trackingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 tracking events per minute per IP
  message: { success: false, message: 'Too many tracking requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ==================== COLLECTION ROUTES ====================

// Public route for selecting collection (serving ads) - WITH RATE LIMITING
router.get('/ad-collections/select', adSelectLimiter, optionalAuth, selectCollection);

// Admin routes for collections
router.get('/ad-collections', authenticate, authorize('admin', 'editor'), getAllCollections);
router.post('/ad-collections', authenticate, authorize('admin'), createCollection);
router.get('/ad-collections/:id', authenticate, authorize('admin', 'editor'), getCollection);
router.put('/ad-collections/:id', authenticate, authorize('admin'), updateCollection);
router.delete('/ad-collections/:id', authenticate, authorize('admin'), deleteCollection);
router.post('/ad-collections/:id/duplicate', authenticate, authorize('admin'), duplicateCollection);
router.post('/ad-collections/:id/update-stats', authenticate, authorize('admin'), updateCollectionStats);
router.get('/ad-collections/:id/analytics', authenticate, authorize('admin', 'editor'), getCollectionAnalytics);

// Bulk operations for collections
router.post('/ad-collections/bulk-update', authenticate, authorize('admin'), bulkUpdateCollections);
router.post('/ad-collections/bulk-delete', authenticate, authorize('admin'), bulkDeleteCollections);

// ==================== ADS ROUTES ====================

// Get all ads in a collection
router.get('/ad-collections/:collectionId/ads', authenticate, authorize('admin', 'editor'), getAds);

// Create ad in collection
router.post('/ad-collections/:collectionId/ads', authenticate, authorize('admin'), createAd);

// Reorder ads in collection
router.put('/ad-collections/:collectionId/ads/reorder', authenticate, authorize('admin'), reorderAds);

// Single ad operations
router.get('/ads/:id', authenticate, authorize('admin', 'editor'), getAd);
router.put('/ads/:id', authenticate, authorize('admin'), updateAd);
router.delete('/ads/:id', authenticate, authorize('admin'), deleteAd);
router.post('/ads/:id/duplicate', authenticate, authorize('admin'), duplicateAd);
router.get('/ads/:id/analytics', authenticate, authorize('admin', 'editor'), getAdAnalytics);

// Bulk operations for ads
router.post('/ads/bulk-update', authenticate, authorize('admin'), bulkUpdateAds);
router.post('/ads/bulk-delete', authenticate, authorize('admin'), bulkDeleteAds);

// ==================== TRACKING (PUBLIC) ====================

// Track impression or click - WITH RATE LIMITING
router.post('/ads/track', trackingLimiter, optionalAuth, trackEvent);

export default router;
