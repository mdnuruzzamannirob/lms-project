import { Router } from 'express'
import passport from 'passport'

import { AppError } from '../../common/errors/AppError'
import { authenticateUser } from '../../common/middlewares/auth'
import { validateRequest } from '../../common/middlewares/validateRequest'
import { config } from '../../config'
import {
  challengeTwoFactor,
  changeMyPassword,
  disableTwoFactor,
  enableTwoFactor,
  forgotPassword,
  getBackupCodesCount,
  getMe,
  getMyLoginHistory,
  login,
  logout,
  refreshSession,
  register,
  resendResetOtp,
  resendVerification,
  resetPassword,
  sendUserEmailOtp,
  socialCallback,
  updateMe,
  updateMyNotificationPreferences,
  verifyEmail,
  verifyResetOtp,
  verifyTwoFactor,
} from './controller'
import { authValidation } from './validation'

const router = Router()

const ensureGoogleConfigured = (): void => {
  if (
    !config.oauth.googleClientId ||
    !config.oauth.googleClientSecret ||
    !config.oauth.googleCallbackUrl
  ) {
    throw new AppError('Google authentication is not configured.', 503)
  }
}

const ensureFacebookConfigured = (): void => {
  if (
    !config.oauth.facebookAppId ||
    !config.oauth.facebookAppSecret ||
    !config.oauth.facebookCallbackUrl
  ) {
    throw new AppError('Facebook authentication is not configured.', 503)
  }
}

router.post(
  '/register',
  validateRequest({ body: authValidation.registerBody }),
  register,
)
router.post(
  '/login',
  validateRequest({ body: authValidation.loginBody }),
  login,
)
router.post(
  '/2fa/challenge',
  validateRequest({ body: authValidation.twoFactorChallengeBody }),
  challengeTwoFactor,
)
router.post(
  '/2fa/email/send',
  validateRequest({ body: authValidation.sendEmailOtpBody }),
  sendUserEmailOtp,
)

router.get(
  '/google',
  (_request, _response, next) => {
    ensureGoogleConfigured()
    next()
  },
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  }),
)
router.get(
  '/google/callback',
  (_request, _response, next) => {
    ensureGoogleConfigured()
    next()
  },
  passport.authenticate('google', {
    session: false,
    failWithError: true,
  }),
  socialCallback,
)

router.get(
  '/facebook',
  (_request, _response, next) => {
    ensureFacebookConfigured()
    next()
  },
  passport.authenticate('facebook', {
    scope: ['email'],
    session: false,
  }),
)
router.get(
  '/facebook/callback',
  (_request, _response, next) => {
    ensureFacebookConfigured()
    next()
  },
  passport.authenticate('facebook', {
    session: false,
    failWithError: true,
  }),
  socialCallback,
)

router.post('/logout', logout)
router.post('/refresh', refreshSession)
router.post(
  '/verify-email',
  validateRequest({ body: authValidation.verifyEmailBody }),
  verifyEmail,
)
router.post(
  '/resend-verification',
  validateRequest({ body: authValidation.resendVerificationBody }),
  resendVerification,
)
router.post(
  '/forgot-password',
  validateRequest({ body: authValidation.forgotPasswordBody }),
  forgotPassword,
)
router.post(
  '/resend-reset-otp',
  validateRequest({ body: authValidation.resendResetOtpBody }),
  resendResetOtp,
)
router.post(
  '/verify-reset-otp',
  validateRequest({ body: authValidation.verifyResetOtpBody }),
  verifyResetOtp,
)
router.post(
  '/reset-password',
  validateRequest({ body: authValidation.resetPasswordBody }),
  resetPassword,
)

router.get('/me', authenticateUser, getMe)
router.post('/2fa/enable', authenticateUser, enableTwoFactor)
router.post(
  '/2fa/verify',
  authenticateUser,
  validateRequest({ body: authValidation.twoFactorVerifyBody }),
  verifyTwoFactor,
)
router.post(
  '/2fa/disable',
  authenticateUser,
  validateRequest({ body: authValidation.twoFactorDisableBody }),
  disableTwoFactor,
)
router.get(
  '/2fa/backup-codes',
  authenticateUser,
  validateRequest({ query: authValidation.twoFactorBackupCodesQuery }),
  getBackupCodesCount,
)
router.get('/me/login-history', authenticateUser, getMyLoginHistory)
router.patch(
  '/me',
  authenticateUser,
  validateRequest({ body: authValidation.updateMeBody }),
  updateMe,
)
router.patch(
  '/me/password',
  authenticateUser,
  validateRequest({ body: authValidation.changePasswordBody }),
  changeMyPassword,
)
router.patch(
  '/me/notification-prefs',
  authenticateUser,
  validateRequest({ body: authValidation.updateNotificationPreferencesBody }),
  updateMyNotificationPreferences,
)

export const authRouter = router
