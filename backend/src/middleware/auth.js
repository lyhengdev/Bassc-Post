import { verifyAccessToken } from '../utils/jwt.js';
import { User } from '../models/index.js';
import { unauthorizedResponse, forbiddenResponse } from '../utils/apiResponse.js';

/**
 * Authenticate user via JWT token
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorizedResponse(res, 'Access token is required');
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = verifyAccessToken(token);

    // Get user from database
    const user = await User.findById(decoded.id);

    if (!user) {
      return unauthorizedResponse(res, 'User not found');
    }

    if (user.status !== 'active') {
      return forbiddenResponse(res, 'Your account has been deactivated');
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.message === 'Token has expired') {
      return unauthorizedResponse(res, 'Token has expired. Please login again.');
    }
    return unauthorizedResponse(res, 'Invalid or expired token');
  }
};

/**
 * Optional authentication - doesn't fail if no token or invalid token
 * This middleware NEVER returns an error - it either sets req.user or doesn't
 */
export const optionalAuth = async (req, res, next) => {
  // Default: no user
  req.user = null;
  
  try {
    const authHeader = req.headers.authorization;

    // No auth header - continue without user
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    
    // Empty or invalid token string - continue without user
    if (!token || token === 'undefined' || token === 'null' || token.length < 10) {
      return next();
    }
    
    // Try to verify token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (tokenError) {
      // Token verification failed (expired, invalid, etc.) - continue without user
      // This is expected and normal for expired tokens
      return next();
    }
    
    // Try to find user
    const user = await User.findById(decoded.id);

    if (user && user.status === 'active') {
      req.user = user;
    }

    next();
  } catch (error) {
    // Any other error - continue without user
    // Log for debugging but don't fail the request
    console.warn('optionalAuth unexpected error:', error.message);
    next();
  }
};

/**
 * Authorize by role(s)
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return unauthorizedResponse(res, 'Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      return forbiddenResponse(
        res,
        `Access denied. Required role(s): ${roles.join(', ')}`
      );
    }

    next();
  };
};

/**
 * Check if user is admin
 */
export const isAdmin = authorize('admin');

/**
 * Check if user is editor or higher
 */
export const isEditor = authorize('admin', 'editor');

/**
 * Check if user is writer or higher
 */
export const isWriter = authorize('admin', 'editor', 'writer');

/**
 * Check if user owns the resource or is admin
 */
export const isOwnerOrAdmin = (getOwnerId) => {
  return async (req, res, next) => {
    if (!req.user) {
      return unauthorizedResponse(res, 'Authentication required');
    }

    // Admins can access everything
    if (req.user.role === 'admin') {
      return next();
    }

    try {
      const ownerId = await getOwnerId(req);

      if (!ownerId) {
        return forbiddenResponse(res, 'Resource not found');
      }

      if (ownerId.toString() !== req.user._id.toString()) {
        return forbiddenResponse(res, 'You do not have permission to access this resource');
      }

      next();
    } catch (error) {
      return forbiddenResponse(res, 'Access denied');
    }
  };
};

export default {
  authenticate,
  optionalAuth,
  authorize,
  isAdmin,
  isEditor,
  isWriter,
  isOwnerOrAdmin,
};
