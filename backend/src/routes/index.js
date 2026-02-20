import { Router } from 'express';
import authRoutes from './authRoutes.js';
import articleRoutes from './articleRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import userRoutes from './userRoutes.js';
import uploadRoutes from './uploadRoutes.js';
import aiRoutes from './aiRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import contactRoutes from './contactRoutes.js';
import settingsRoutes from './settingsRoutes.js';
import commentRoutes from './commentRoutes.js';
import newsletterRoutes from './newsletterRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import adsRoutes from './adsRoutes.js';
import translationRoutes from './translationRoutes.js';
import campaignRoutes from './campaignRoutes.js';
import searchRoutes from './searchRoutes.js';
import advancedAnalyticsRoutes from './advancedAnalyticsRoutes.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Bassac Media Center API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Fetch URL endpoint for EditorJS LinkTool
router.get('/fetch-url', optionalAuth, async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ success: 0, message: 'URL is required' });
    }

    // Basic URL validation
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch (e) {
      return res.status(400).json({ success: 0, message: 'Invalid URL' });
    }

    // Return basic link data (in production, you might want to fetch meta tags)
    return res.json({
      success: 1,
      link: url,
      meta: {
        title: parsedUrl.hostname,
        description: '',
        image: {
          url: ''
        }
      }
    });
  } catch (error) {
    console.error('Fetch URL error:', error);
    return res.status(500).json({ success: 0, message: 'Failed to fetch URL' });
  }
});

// API Routes
router.use('/auth', authRoutes);
router.use('/articles', articleRoutes);
router.use('/categories', categoryRoutes);
router.use('/users', userRoutes);
router.use('/uploads', uploadRoutes);
router.use('/ai', aiRoutes);
router.use('/analytics', analyticsRoutes); // Fixed: use analyticsRoutes for dashboard endpoints
router.use('/contact', contactRoutes);
router.use('/settings', settingsRoutes);
router.use('/notifications', notificationRoutes);

// Comment routes (mounted at root because they use both /articles/:id/comments and /comments)
router.use('/', commentRoutes);

// Newsletter routes
router.use('/newsletter', newsletterRoutes);

// Translation routes (for multi-language support)
router.use('/translations', translationRoutes);

// Campaign routes (new simplified ads system)
router.use('/campaigns', campaignRoutes);

// Search routes (Elasticsearch-powered search)
router.use('/search', searchRoutes);

// Advanced analytics routes (real-time, cohorts, funnels, etc.)
router.use('/advanced-analytics', advancedAnalyticsRoutes);

// Ads routes (legacy collection-based ads system)
router.use(adsRoutes);

// Dashboard route (redirects to analytics)
router.use('/dashboard', analyticsRoutes);

export default router;
