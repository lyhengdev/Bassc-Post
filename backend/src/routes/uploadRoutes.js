import { Router } from 'express';
import uploadController from '../controllers/uploadController.js';
import { authenticate } from '../middleware/auth.js';
import { validateObjectId } from '../middleware/validation.js';
import { uploadLimiter } from '../middleware/rateLimiter.js';
import { singleFile, multipleImages, handleUploadError } from '../middleware/upload.js';

const router = Router();

// All upload routes require authentication
router.use(authenticate);

// Upload single file
router.post(
  '/',
  uploadLimiter,
  singleFile,
  handleUploadError,
  uploadController.uploadFile
);

// Upload multiple files
router.post(
  '/multiple',
  uploadLimiter,
  multipleImages,
  handleUploadError,
  uploadController.uploadMultipleFiles
);

// Get user's uploads
router.get('/my', uploadController.getMyUploads);

// Get all media (admin/editor see all, others see own)
router.get('/', uploadController.getMedia);

// Get single media
router.get('/:id', validateObjectId(), uploadController.getMediaById);

// Update media metadata
router.put('/:id', validateObjectId(), uploadController.updateMedia);

// Delete media
router.delete('/:id', validateObjectId(), uploadController.deleteMedia);

export default router;
