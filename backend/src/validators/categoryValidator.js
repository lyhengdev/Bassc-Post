import { body, param } from 'express-validator';

export const createCategoryValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ max: 100 })
    .withMessage('Category name cannot exceed 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('color')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Invalid hex color format'),
  body('image')
    .optional()
    .custom((value) => {
      if (value === null || value === '') return true;
      if (typeof value !== 'string') return false;
      if (value.startsWith('/')) return true;
      return /^https?:\/\//.test(value);
    })
    .withMessage('Image must be a URL or a relative path'),
  body('parent')
    .optional()
    .isMongoId()
    .withMessage('Invalid parent category ID'),
  body('order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Order must be a non-negative integer'),
  body('metaTitle')
    .optional()
    .trim()
    .isLength({ max: 70 })
    .withMessage('Meta title cannot exceed 70 characters'),
  body('metaDescription')
    .optional()
    .trim()
    .isLength({ max: 160 })
    .withMessage('Meta description cannot exceed 160 characters'),
];

export const updateCategoryValidator = [
  param('id').isMongoId().withMessage('Invalid category ID'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Category name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Category name cannot exceed 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('color')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Invalid hex color format'),
  body('image')
    .optional()
    .custom((value) => {
      if (value === null || value === '') return true;
      if (typeof value !== 'string') return false;
      if (value.startsWith('/')) return true;
      return /^https?:\/\//.test(value);
    })
    .withMessage('Image must be a URL or a relative path'),
  body('parent')
    .optional()
    .custom((value) => {
      if (value === null || value === '') return true;
      return /^[0-9a-fA-F]{24}$/.test(value);
    })
    .withMessage('Invalid parent category ID'),
  body('order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Order must be a non-negative integer'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

export default {
  createCategoryValidator,
  updateCategoryValidator,
};
