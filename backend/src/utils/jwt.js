import jwt from 'jsonwebtoken';
import config from '../config/index.js';

/**
 * Generate access token
 */
export const generateAccessToken = (payload) => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

/**
 * Generate refresh token
 */
export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
};

/**
 * Generate both access and refresh tokens
 */
export const generateTokens = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    role: user.role,
  };

  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
};

/**
 * Verify access token
 */
export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw error;
  }
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.refreshSecret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid refresh token');
    }
    throw error;
  }
};

/**
 * Generate email verification token
 */
export const generateEmailVerificationToken = () => {
  const token = jwt.sign(
    { purpose: 'email-verification' },
    config.jwt.secret,
    { expiresIn: '24h' }
  );
  return token;
};

/**
 * Generate password reset token
 */
export const generatePasswordResetToken = () => {
  const token = jwt.sign(
    { purpose: 'password-reset' },
    config.jwt.secret,
    { expiresIn: '1h' }
  );
  return token;
};

/**
 * Decode token without verification (for debugging)
 */
export const decodeToken = (token) => {
  return jwt.decode(token);
};

/**
 * Get token expiration date
 */
export const getTokenExpiration = (token) => {
  const decoded = jwt.decode(token);
  if (decoded && decoded.exp) {
    return new Date(decoded.exp * 1000);
  }
  return null;
};

export default {
  generateAccessToken,
  generateRefreshToken,
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  generateEmailVerificationToken,
  generatePasswordResetToken,
  decodeToken,
  getTokenExpiration,
};
