import { validationResult } from 'express-validator';
import { validationErrorResponse } from '../utils/apiResponse.js';

/**
 * Validation result handler middleware
 * Use after express-validator checks
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((error) => ({
      field: error.path,
      message: error.msg,
      value: error.value,
    }));

    return validationErrorResponse(res, formattedErrors);
  }

  next();
};

/**
 * Sanitize MongoDB query to prevent injection
 */
export const sanitizeQuery = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;

    for (const key in obj) {
      if (key.startsWith('$')) {
        delete obj[key];
      } else if (typeof obj[key] === 'object') {
        sanitize(obj[key]);
      }
    }

    return obj;
  };

  req.query = sanitize(req.query);
  req.body = sanitize(req.body);
  req.params = sanitize(req.params);

  next();
};

/**
 * Validate MongoDB ObjectId
 */
export const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];

    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return validationErrorResponse(res, [
        {
          field: paramName,
          message: 'Invalid ID format',
          value: id,
        },
      ]);
    }

    next();
  };
};

/**
 * Validate file upload
 */
export const validateFileUpload = (options = {}) => {
  const {
    required = true,
    maxSize = 10 * 1024 * 1024, // 10MB
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  } = options;

  return (req, res, next) => {
    const errors = [];

    if (required && !req.file) {
      errors.push({
        field: 'file',
        message: 'File is required',
      });
    }

    if (req.file) {
      if (req.file.size > maxSize) {
        errors.push({
          field: 'file',
          message: `File size exceeds maximum of ${maxSize / 1024 / 1024}MB`,
          value: req.file.size,
        });
      }

      if (!allowedTypes.includes(req.file.mimetype)) {
        errors.push({
          field: 'file',
          message: `Invalid file type. Allowed: ${allowedTypes.join(', ')}`,
          value: req.file.mimetype,
        });
      }
    }

    if (errors.length > 0) {
      return validationErrorResponse(res, errors);
    }

    next();
  };
};

export default {
  validate,
  sanitizeQuery,
  validateObjectId,
  validateFileUpload,
};
