import { body, query, param } from 'express-validator';

export const createArticleValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('content')
    .notEmpty()
    .withMessage('Content is required')
    .isObject()
    .withMessage('Content must be a valid Editor.js object'),
  body('content.blocks')
    .isArray({ min: 1 })
    .withMessage('Content must have at least one block'),
  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isMongoId()
    .withMessage('Invalid category ID'),
  body('excerpt')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Excerpt cannot exceed 500 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Each tag cannot exceed 50 characters'),
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
  body('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('isFeatured must be a boolean'),
  body('isBreaking')
    .optional()
    .isBoolean()
    .withMessage('isBreaking must be a boolean'),
];

export const updateArticleValidator = [
  param('id').isMongoId().withMessage('Invalid article ID'),
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('content')
    .optional()
    .isObject()
    .withMessage('Content must be a valid Editor.js object'),
  body('content.blocks')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Content must have at least one block'),
  body('category')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID'),
  body('excerpt')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Excerpt cannot exceed 500 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('status')
    .optional()
    .isIn(['draft', 'pending', 'published', 'rejected', 'archived'])
    .withMessage('Invalid status value'),
];

export const listArticlesValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('category')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Category slug must be 1-100 characters'),
  query('tag')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Tag must be 1-50 characters'),
  query('author')
    .optional()
    .isMongoId()
    .withMessage('Invalid author ID'),
  query('status')
    .optional()
    .isIn(['draft', 'pending', 'published', 'rejected', 'archived'])
    .withMessage('Invalid status value'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'publishedAt', 'viewCount', 'title'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  query('isBreaking')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('isBreaking must be true or false'),
  query('isFeatured')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('isFeatured must be true or false'),
];

export const searchArticlesValidator = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Search query must be at least 2 characters'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

export const approveArticleValidator = [
  param('id').isMongoId().withMessage('Invalid article ID'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
];

export const rejectArticleValidator = [
  param('id').isMongoId().withMessage('Invalid article ID'),
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Rejection reason is required')
    .isLength({ max: 1000 })
    .withMessage('Reason cannot exceed 1000 characters'),
];

export default {
  createArticleValidator,
  updateArticleValidator,
  listArticlesValidator,
  searchArticlesValidator,
  approveArticleValidator,
  rejectArticleValidator,
};
