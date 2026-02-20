import express from 'express';
import {
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  duplicateCampaign,
  toggleCampaignStatus,
  updateCampaignStatus,
  addAdVariation,
  updateAdVariation,
  deleteAdVariation,
  toggleAdVariation,
  getCampaignAnalytics,
  getDashboardSummary,
  getCampaignForDisplay,
  trackAdEvent,
} from '../controllers/campaignController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// ==================== PUBLIC ROUTES ====================

// Get campaign for display (public endpoint)
router.post('/display', getCampaignForDisplay);

// Track ad events (public endpoint)
router.post('/track', trackAdEvent);

// ==================== PROTECTED ROUTES ====================

// All routes below require authentication
router.use(authenticate);

// Dashboard summary (admin/editor)
router.get(
  '/dashboard/summary',
  authorize(['admin', 'editor']),
  getDashboardSummary
);

// Campaign CRUD
router.get('/', authorize(['admin', 'editor']), getCampaigns);
router.get('/:id', authorize(['admin', 'editor']), getCampaign);
router.post('/', authorize(['admin', 'editor']), createCampaign);
router.put('/:id', authorize(['admin', 'editor']), updateCampaign);
router.delete('/:id', authorize(['admin']), deleteCampaign);

// Campaign actions
router.post('/:id/duplicate', authorize(['admin', 'editor']), duplicateCampaign);
router.post('/:id/toggle', authorize(['admin', 'editor']), toggleCampaignStatus);
router.put('/:id/status', authorize(['admin', 'editor']), updateCampaignStatus);

// Ad variations
router.post('/:id/ads', authorize(['admin', 'editor']), addAdVariation);
router.put('/:id/ads/:adId', authorize(['admin', 'editor']), updateAdVariation);
router.delete('/:id/ads/:adId', authorize(['admin', 'editor']), deleteAdVariation);
router.post('/:id/ads/:adId/toggle', authorize(['admin', 'editor']), toggleAdVariation);

// Analytics
router.get('/:id/analytics', authorize(['admin', 'editor']), getCampaignAnalytics);

export default router;
