import { Router } from 'express';
import { authenticate, isAdmin } from '../middleware/auth.js';
import { validateObjectId } from '../middleware/validation.js';
import {
  subscribe,
  confirmSubscription,
  unsubscribe,
  updatePreferences,
  getAllSubscribers,
  deleteSubscriber,
  exportSubscribers,
} from '../controllers/newsletterController.js';

const router = Router();

// Public routes
router.post('/subscribe', subscribe);
router.post('/confirm', confirmSubscription);
router.post('/unsubscribe', unsubscribe);
router.put('/preferences', updatePreferences);

// Admin routes
router.get('/', authenticate, isAdmin, getAllSubscribers);
router.get('/export', authenticate, isAdmin, exportSubscribers);
router.delete('/:id', authenticate, isAdmin, validateObjectId(), deleteSubscriber);

export default router;
