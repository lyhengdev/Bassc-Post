import { Router } from 'express';
import aiController from '../controllers/aiController.js';
import { authenticate, isWriter } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// All AI routes require authentication and writer role
router.use(authenticate, isWriter, aiLimiter);

router.post('/grammar-check', aiController.grammarCheck);
router.post('/headline-generator', aiController.generateHeadlines);
router.post('/summary', aiController.generateSummary);
router.post('/sentiment-analysis', aiController.sentimentAnalysis);
router.post('/improve-writing', aiController.improveWriting);
router.post('/translate-article', aiController.translateArticle);

export default router;
