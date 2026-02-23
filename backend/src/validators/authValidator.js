import { body, query, param } from 'express-validator';

export const registerValidator = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/\d/)
    .withMessage('Password must contain at least one number')
    .matches(/[a-zA-Z]/)
    .withMessage('Password must contain at least one letter'),
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters')
    .escape(),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters')
    .escape(),
  body('gender')
    .trim()
    .toLowerCase()
    .isIn(['male', 'female'])
    .withMessage('Gender must be male or female'),
  body('birthday')
    .notEmpty()
    .withMessage('Birthday is required')
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

export const loginValidator = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

export const checkEmailValidator = [
  query('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
];

export const socialProviderValidator = [
  param('provider')
    .trim()
    .toLowerCase()
    .isIn(['google', 'facebook'])
    .withMessage('Unsupported social provider'),
];

export const socialExchangeValidator = [
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Social login code is required'),
];

export const forgotPasswordValidator = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
];

export const resetPasswordValidator = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/\d/)
    .withMessage('Password must contain at least one number')
    .matches(/[a-zA-Z]/)
    .withMessage('Password must contain at least one letter'),
];

export const changePasswordValidator = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/\d/)
    .withMessage('New password must contain at least one number')
    .matches(/[a-zA-Z]/)
    .withMessage('New password must contain at least one letter'),
];

export const verifyEmailValidator = [
  body('token').notEmpty().withMessage('Verification token is required'),
];

export default {
  registerValidator,
  loginValidator,
  checkEmailValidator,
  socialProviderValidator,
  socialExchangeValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  changePasswordValidator,
  verifyEmailValidator,
};
