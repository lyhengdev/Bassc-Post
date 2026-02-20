import config from '../config/index.js';
import { AppError } from '../utils/errors.js';

/**
 * Handle 404 Not Found
 */
export const notFound = (req, res, next) => {
  const error = new AppError(`Route not found: ${req.originalUrl}`, 404);
  next(error);
};

/**
 * Global error handler
 */
export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.stack = err.stack;

  // Log error for debugging
  if (config.env === 'development') {
    console.error('❌ Error:', {
      message: error.message,
      stack: error.stack,
      url: req.originalUrl,
      method: req.method,
    });
  } else {
    console.error('❌ Error:', error.message);
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    error = new AppError('Invalid resource ID', 400);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = new AppError(`${field} already exists`, 409);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    error = new AppError(messages.join('. '), 422);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid token', 401);
  }

  if (err.name === 'TokenExpiredError') {
    error = new AppError('Token has expired', 401);
  }

  // Multer errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      error = new AppError('File is too large', 400);
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      error = new AppError('Unexpected file field', 400);
    } else {
      error = new AppError(err.message, 400);
    }
  }

  // Default status code
  const statusCode = error.statusCode || 500;
  const status = error.status || 'error';

  // Response
  const response = {
    success: false,
    status,
    message: error.message || 'Internal server error',
  };

  // Include validation errors if present
  if (error.errors) {
    response.errors = error.errors;
  }

  // Include stack trace in development
  if (config.env === 'development') {
    response.stack = error.stack;
  }

  res.status(statusCode).json(response);
};

/**
 * Async handler wrapper to catch errors in async routes
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    return Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default {
  notFound,
  errorHandler,
  asyncHandler,
};
