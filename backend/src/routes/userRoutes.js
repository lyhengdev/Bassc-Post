import { Router } from 'express';
import userController from '../controllers/userController.js';
import { authenticate, isAdmin } from '../middleware/auth.js';
import { validate, validateObjectId } from '../middleware/validation.js';
import { avatarUpload, handleUploadError } from '../middleware/upload.js';
import {
  updateUserValidator,
  updateProfileValidator,
  listUsersValidator,
} from '../validators/userValidator.js';

const router = Router();

// Public routes
router.get('/profile/:id', validateObjectId('id'), userController.getPublicProfile);

// Protected routes
router.use(authenticate);

// User's own profile
router.put('/profile', updateProfileValidator, validate, userController.updateProfile);
router.post('/avatar', avatarUpload, handleUploadError, userController.uploadAvatar);
router.delete('/avatar', userController.deleteAvatar);

// Admin only routes
router.get('/', isAdmin, listUsersValidator, validate, userController.getUsers);
router.get('/stats', isAdmin, userController.getUserStats);
router.get('/:id', isAdmin, validateObjectId(), userController.getUserById);
router.put('/:id', isAdmin, validateObjectId(), updateUserValidator, validate, userController.updateUser);
router.delete('/:id', isAdmin, validateObjectId(), userController.deleteUser);

export default router;
