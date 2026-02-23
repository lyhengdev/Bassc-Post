import { Router } from 'express';
import authController from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimiter.js';
import { loginRateLimiter, checkAccountLockout } from '../middleware/loginLimiter.js';
import { getCsrfToken } from '../middleware/csrf.js';
import {
  registerValidator,
  checkEmailValidator,
  socialProviderValidator,
  socialExchangeValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  changePasswordValidator,
  verifyEmailValidator,
} from '../validators/authValidator.js';

const router = Router();

// CSRF token endpoint (for SPA to get token)
router.get('/csrf-token', getCsrfToken);

// Public routes
router.get(
  '/check-email',
  authLimiter,
  checkEmailValidator,
  validate,
  authController.checkEmailAvailability
);

router.get(
  '/social/:provider',
  authLimiter,
  socialProviderValidator,
  validate,
  authController.startSocialAuth
);

router.get(
  '/social/:provider/callback',
  authLimiter,
  socialProviderValidator,
  validate,
  authController.socialAuthCallback
);

router.post(
  '/social/exchange',
  authLimiter,
  socialExchangeValidator,
  validate,
  authController.socialExchange
);

router.post(
  '/register',
  authLimiter,
  registerValidator,
  validate,
  authController.register
);

router.post(
  '/login',
  authLimiter,           // General rate limit
  loginRateLimiter,      // Stricter login-specific rate limit
  checkAccountLockout,   // Check if account is locked
  loginValidator,
  validate,
  authController.login
);

router.post(
  '/forgot-password',
  passwordResetLimiter,
  forgotPasswordValidator,
  validate,
  authController.forgotPassword
);

router.post(
  '/reset-password',
  passwordResetLimiter,
  resetPasswordValidator,
  validate,
  authController.resetPassword
);

router.post(
  '/verify-email',
  verifyEmailValidator,
  validate,
  authController.verifyEmail
);

router.post('/refresh', authController.refreshToken);

// Protected routes
router.use(authenticate);

router.get('/me', authController.getMe);
router.post('/logout', authController.logout);
router.post('/resend-verification', authController.resendVerification);
router.post(
  '/change-password',
  changePasswordValidator,
  validate,
  authController.changePassword
);

export default router;
