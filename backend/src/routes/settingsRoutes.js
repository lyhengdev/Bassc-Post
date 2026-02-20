import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getSettings,
  updateSettings,
  getPublicSettings,
  updateHomepageSections,
  updateMenus,
  updateWidgets,
  updateSEOSettings,
  updateBranding,
  toggleFeature
} from '../controllers/settingsController.js';

const router = Router();

// Public routes
router.get('/public', getPublicSettings);

// Admin routes
router.get('/', authenticate, authorize('admin'), getSettings);
router.put('/', authenticate, authorize('admin'), updateSettings);
router.put('/homepage', authenticate, authorize('admin'), updateHomepageSections);
router.put('/menus', authenticate, authorize('admin'), updateMenus);
router.put('/widgets', authenticate, authorize('admin'), updateWidgets);
router.put('/seo', authenticate, authorize('admin'), updateSEOSettings);
router.put('/branding', authenticate, authorize('admin'), updateBranding);
router.put('/features/:feature', authenticate, authorize('admin'), toggleFeature);

export default router;
