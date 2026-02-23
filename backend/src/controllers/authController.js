import { User } from '../models/index.js';
import { generateTokens, verifyRefreshToken, generateEmailVerificationToken, generatePasswordResetToken } from '../utils/jwt.js';
import emailService from '../services/emailService.js';
import { recordFailedAttempt, clearFailedAttempts } from '../middleware/loginLimiter.js';
import logger from '../services/loggerService.js';
import {
  successResponse,
  createdResponse,
  badRequestResponse,
  unauthorizedResponse,
  notFoundResponse,
  conflictResponse,
} from '../utils/apiResponse.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * Register new user
 * POST /api/auth/register
 */
export const register = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName } = req.body;

  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return conflictResponse(res, 'Email already registered');
  }

  // Create user
  const user = await User.create({
    email,
    password,
    firstName,
    lastName,
    role: 'user',
  });

  // Generate email verification token
  const verificationToken = generateEmailVerificationToken();
  user.emailVerificationToken = verificationToken;
  user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  await user.save();

  // Send verification email
  try {
    await emailService.sendVerificationEmail(user, verificationToken);
  } catch (error) {
    logger.error('Failed to send verification email', { 
      error, 
      userId: user._id,
      requestId: req.requestId 
    });
  }

  // Generate tokens
  const tokens = generateTokens(user);

  // Save refresh token
  user.refreshToken = tokens.refreshToken;
  await user.save();

  logger.info('New user registered', { 
    userId: user._id, 
    email: user.email,
    requestId: req.requestId 
  });

  return createdResponse(res, {
    user: {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
    },
    ...tokens,
  }, 'Registration successful. Please verify your email.');
});

/**
 * Login user
 * POST /api/auth/login
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const clientIp = req.ip;

  // Find user with password
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    // Record failed attempt even for non-existent users (prevent user enumeration)
    recordFailedAttempt(email, clientIp);
    return unauthorizedResponse(res, 'Invalid email or password');
  }

  // Check password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    // Record failed attempt
    const result = recordFailedAttempt(email, clientIp);
    
    if (result.locked) {
      return res.status(423).json({
        success: false,
        message: `Too many failed attempts. Account locked for ${Math.ceil(result.remainingSeconds / 60)} minutes.`,
        retryAfter: result.remainingSeconds,
      });
    }
    
    return unauthorizedResponse(res, `Invalid email or password. ${result.attemptsRemaining} attempts remaining.`);
  }

  // Check if user is active
  if (user.status !== 'active') {
    logger.logSecurity('Login attempt on inactive account', { 
      email, 
      userId: user._id,
      requestId: req.requestId 
    });
    return unauthorizedResponse(res, 'Your account has been deactivated. Please contact support.');
  }

  // Clear failed attempts on successful login
  clearFailedAttempts(email, clientIp);

  // Update last login
  user.lastLogin = new Date();

  // Generate tokens
  const tokens = generateTokens(user);
  user.refreshToken = tokens.refreshToken;
  await user.save();

  logger.info('User logged in', { 
    userId: user._id, 
    email: user.email,
    requestId: req.requestId 
  });

  return successResponse(res, {
    user: {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      avatar: user.avatar,
      isEmailVerified: user.isEmailVerified,
    },
    ...tokens,
  }, 'Login successful');
});

/**
 * Get current user
 * GET /api/auth/me
 */
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  return successResponse(res, {
    user: {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      role: user.role,
      avatar: user.avatar,
      bio: user.bio,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
    },
  });
});

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    return badRequestResponse(res, 'Refresh token is required');
  }

  try {
    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== token) {
      return unauthorizedResponse(res, 'Invalid refresh token');
    }

    // Generate new tokens
    const tokens = generateTokens(user);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    return successResponse(res, tokens, 'Token refreshed');
  } catch (error) {
    return unauthorizedResponse(res, 'Invalid or expired refresh token');
  }
});

/**
 * Logout
 * POST /api/auth/logout
 */
export const logout = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.refreshToken = null;
  await user.save();

  return successResponse(res, null, 'Logged out successfully');
});

/**
 * Verify email
 * POST /api/auth/verify-email
 */
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;

  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: new Date() },
  }).select('+emailVerificationToken +emailVerificationExpires');

  if (!user) {
    return badRequestResponse(res, 'Invalid or expired verification token');
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  return successResponse(res, null, 'Email verified successfully');
});

/**
 * Resend verification email
 * POST /api/auth/resend-verification
 */
export const resendVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user.isEmailVerified) {
    return badRequestResponse(res, 'Email is already verified');
  }

  const verificationToken = generateEmailVerificationToken();
  user.emailVerificationToken = verificationToken;
  user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();

  await emailService.sendVerificationEmail(user, verificationToken);

  return successResponse(res, null, 'Verification email sent');
});

/**
 * Forgot password
 * POST /api/auth/forgot-password
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  // Don't reveal if email exists
  if (!user) {
    return successResponse(res, null, 'If the email exists, a reset link has been sent');
  }

  const resetToken = generatePasswordResetToken();
  user.passwordResetToken = resetToken;
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await user.save();

  try {
    await emailService.sendPasswordResetEmail(user, resetToken);
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    throw error;
  }

  return successResponse(res, null, 'If the email exists, a reset link has been sent');
});

/**
 * Reset password
 * POST /api/auth/reset-password
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  const user = await User.findOne({
    passwordResetToken: token,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) {
    return badRequestResponse(res, 'Invalid or expired reset token');
  }

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.refreshToken = null; // Invalidate all sessions
  await user.save();

  return successResponse(res, null, 'Password reset successful. Please login with your new password.');
});

/**
 * Change password (authenticated)
 * POST /api/auth/change-password
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return badRequestResponse(res, 'Current password is incorrect');
  }

  user.password = newPassword;
  await user.save();

  return successResponse(res, null, 'Password changed successfully');
});

export default {
  register,
  login,
  getMe,
  refreshToken,
  logout,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  changePassword,
};
