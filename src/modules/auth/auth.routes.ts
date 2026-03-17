import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { authenticateUser } from '../../middleware/authenticate'
import { validate } from '../../middleware/validate'
import * as AuthController from './auth.controller'
import {
  changePasswordRules,
  facebookAuthRules,
  forgotPasswordRules,
  googleAuthRules,
  loginHistoryQueryRules,
  loginRules,
  notificationPrefsRules,
  registerRules,
  resetPasswordRules,
  updateProfileRules,
  verifyEmailRules,
} from './auth.validator'

const router: Router = Router()

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many requests. Please try again in an hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// ─── Public ───────────────────────────────────────────────────────────────────
router.post(
  '/register',
  authLimiter,
  validate(registerRules),
  AuthController.register,
)
router.post('/login', authLimiter, validate(loginRules), AuthController.login)
router.post(
  '/google',
  authLimiter,
  validate(googleAuthRules),
  AuthController.googleAuth,
)
router.post(
  '/facebook',
  authLimiter,
  validate(facebookAuthRules),
  AuthController.facebookAuth,
)
router.post(
  '/verify-email',
  validate(verifyEmailRules),
  AuthController.verifyEmail,
)
router.post(
  '/forgot-password',
  strictLimiter,
  validate(forgotPasswordRules),
  AuthController.forgotPassword,
)
router.post(
  '/reset-password',
  strictLimiter,
  validate(resetPasswordRules),
  AuthController.resetPassword,
)

// ─── Authenticated ────────────────────────────────────────────────────────────
router.post('/logout', authenticateUser, AuthController.logout)
router.post(
  '/resend-verification',
  authenticateUser,
  strictLimiter,
  AuthController.resendVerification,
)
router.get('/me', authenticateUser, AuthController.getMe)
router.patch(
  '/me',
  authenticateUser,
  validate(updateProfileRules),
  AuthController.updateMe,
)
router.patch(
  '/me/password',
  authenticateUser,
  validate(changePasswordRules),
  AuthController.changePassword,
)
router.patch(
  '/me/notification-prefs',
  authenticateUser,
  validate(notificationPrefsRules),
  AuthController.updateNotificationPrefs,
)
router.get(
  '/me/login-history',
  authenticateUser,
  validate(loginHistoryQueryRules),
  AuthController.getLoginHistory,
)

export default router
