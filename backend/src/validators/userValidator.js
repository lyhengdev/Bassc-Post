import { body, param, query } from 'express-validator';

export const updateUserValidator = [
  param('id').isMongoId().withMessage('Invalid user ID'),
  body('firstName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('First name cannot be empty')
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters')
    .escape(),
  body('lastName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Last name cannot be empty')
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters')
    .escape(),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'editor', 'writer', 'user'])
    .withMessage('Invalid role'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'suspended'])
    .withMessage('Invalid status'),
  body('gender')
    .optional()
    .trim()
    .toLowerCase()
    .isIn(['male', 'female'])
    .withMessage('Gender must be male or female'),
  body('birthday')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601({ strict: true, strictSeparator: true })
    .withMessage('Birthday must be a valid date')
    .custom((value) => {
      const birthday = new Date(value);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (birthday > today) {
        throw new Error('Birthday cannot be in the future');
      }
      return true;
    })
    .toDate(),
];

export const updateProfileValidator = [
  body('firstName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('First name cannot be empty')
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters')
    .escape(),
  body('lastName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Last name cannot be empty')
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters')
    .escape(),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),
  body('gender')
    .optional()
    .trim()
    .toLowerCase()
    .isIn(['male', 'female'])
    .withMessage('Gender must be male or female'),
  body('birthday')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601({ strict: true, strictSeparator: true })
    .withMessage('Birthday must be a valid date')
    .custom((value) => {
      const birthday = new Date(value);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (birthday > today) {
        throw new Error('Birthday cannot be in the future');
      }
      return true;
    })
    .toDate(),
];

export const listUsersValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('role')
    .optional()
    .isIn(['admin', 'editor', 'writer', 'user'])
    .withMessage('Invalid role'),
  query('status')
    .optional()
    .isIn(['active', 'inactive', 'suspended'])
    .withMessage('Invalid status'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Search query must be at least 2 characters'),
];

export default {
  updateUserValidator,
  updateProfileValidator,
  listUsersValidator,
};
