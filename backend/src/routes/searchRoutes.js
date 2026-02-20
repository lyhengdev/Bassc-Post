import express from 'express';
import {
  search,
  autocomplete,
  getSimilar,
  getTrending,
  reindex,
  getSearchStats,
} from '../controllers/searchController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// ==================== PUBLIC ROUTES ====================

// Main search endpoint
router.get('/', search);

// Autocomplete
router.get('/autocomplete', autocomplete);

// Get similar articles
router.get('/similar/:articleId', getSimilar);

// Get trending articles
router.get('/trending', getTrending);

// ==================== ADMIN ROUTES ====================

// Reindex all articles (admin only)
router.post(
  '/reindex',
  authenticate,
  authorize(['admin']),
  reindex
);

// Get search statistics (admin only)
router.get(
  '/stats',
  authenticate,
  authorize(['admin']),
  getSearchStats
);

export default router;
