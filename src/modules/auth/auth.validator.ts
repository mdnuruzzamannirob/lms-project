import { body, query } from 'express-validator'

export const registerRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required.')
    .isLength({ max: 100 })
    .withMessage('Name too long.'),
  body('email')
    .normalizeEmail()
    .isEmail()
    .withMessage('Valid email is required.'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters.')
    .isLength({ max: 100 })
    .withMessage('Password too long.'),
  body('language')
    .optional()
    .isIn(['en', 'bn'])
    .withMessage('Language must be en or bn.'),
]

export const loginRules = [
  body('email')
    .normalizeEmail()
    .isEmail()
    .withMessage('Valid email is required.'),
  body('password').notEmpty().withMessage('Password is required.'),
]

export const googleAuthRules = [
  body('id_token').notEmpty().withMessage('Google ID token is required.'),
]

export const facebookAuthRules = [
  body('access_token')
    .notEmpty()
    .withMessage('Facebook access token is required.'),
]

export const verifyEmailRules = [
  body('token').notEmpty().withMessage('Verification token is required.'),
]

export const forgotPasswordRules = [
  body('email')
    .normalizeEmail()
    .isEmail()
    .withMessage('Valid email is required.'),
]

export const resetPasswordRules = [
  body('token').notEmpty().withMessage('Reset token is required.'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters.')
    .isLength({ max: 100 })
    .withMessage('Password too long.'),
]

export const updateProfileRules = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be 1–100 characters.'),
  body('avatar_url').optional().isURL().withMessage('Invalid avatar URL.'),
  body('language')
    .optional()
    .isIn(['en', 'bn'])
    .withMessage('Language must be en or bn.'),
  body('birthday')
    .optional()
    .isISO8601()
    .withMessage('Birthday must be a valid ISO date.'),
  body('timezone')
    .optional()
    .isString()
    .isLength({ max: 60 })
    .withMessage('Invalid timezone.'),
]

export const changePasswordRules = [
  body('current_password')
    .notEmpty()
    .withMessage('Current password is required.'),
  body('new_password')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters.')
    .isLength({ max: 100 })
    .withMessage('New password too long.'),
]

export const notificationPrefsRules = [
  body('email').optional().isBoolean().withMessage('email must be boolean.'),
  body('sms').optional().isBoolean().withMessage('sms must be boolean.'),
  body('in_app').optional().isBoolean().withMessage('in_app must be boolean.'),
  body('push').optional().isBoolean().withMessage('push must be boolean.'),
]

export const loginHistoryQueryRules = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer.'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100.'),
]
