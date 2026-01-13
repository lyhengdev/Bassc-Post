import { Router } from 'express';
import contactController from '../controllers/contactController.js';
import { authenticate, isAdmin } from '../middleware/auth.js';
import { validate, validateObjectId } from '../middleware/validation.js';
import { contactLimiter } from '../middleware/rateLimiter.js';
import { contactValidator } from '../validators/contactValidator.js';

const router = Router();

// Public route - submit contact form
router.post(
  '/',
  contactLimiter,
  contactValidator,
  validate,
  contactController.submitContact
);

// Admin routes
router.use(authenticate, isAdmin);

router.get('/', contactController.getContactMessages);
router.get('/stats', contactController.getContactStats);
router.get('/:id', validateObjectId(), contactController.getContactMessage);
router.put('/:id', validateObjectId(), contactController.updateContactMessage);
router.post('/:id/reply', validateObjectId(), contactController.replyToContact);
router.delete('/:id', validateObjectId(), contactController.deleteContactMessage);

export default router;
