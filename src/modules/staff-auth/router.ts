import { Router } from 'express'

import { authenticateStaff } from '../../common/middlewares/auth'
import { authenticateTempToken } from '../../common/middlewares/authenticateTempToken'
import { validateRequest } from '../../common/middlewares/validateRequest'
import {
  acceptInvite,
  changeStaffPassword,
  disableTwoFactor,
  enableTwoFactor,
  forgotStaffPassword,
  getStaffMe,
  refreshStaffSession,
  resendStaffResetOtp,
  resetStaffPassword,
  sendStaffEmailOtp,
  setupTwoFactor,
  staffLogin,
  staffLogout,
  verifyStaffResetOtp,
  verifyTwoFactor,
} from './controller'
import { staffAuthValidation } from './validation'

const router = Router()

router.post(
  '/login',
  validateRequest({ body: staffAuthValidation.loginBody }),
  staffLogin,
)
router.post(
  '/accept-invite',
  validateRequest({ body: staffAuthValidation.acceptInviteBody }),
  acceptInvite,
)
router.post(
  '/forgot-password',
  validateRequest({ body: staffAuthValidation.forgotPasswordBody }),
  forgotStaffPassword,
)
router.post(
  '/resend-reset-otp',
  validateRequest({ body: staffAuthValidation.resendResetOtpBody }),
  resendStaffResetOtp,
)
router.post(
  '/verify-reset-otp',
  validateRequest({ body: staffAuthValidation.verifyResetOtpBody }),
  verifyStaffResetOtp,
)
router.post(
  '/reset-password',
  validateRequest({ body: staffAuthValidation.resetPasswordBody }),
  resetStaffPassword,
)
router.post('/logout', authenticateStaff, staffLogout)
router.post('/refresh', refreshStaffSession)
router.get('/me', authenticateStaff, getStaffMe)
router.patch(
  '/me/password',
  authenticateStaff,
  validateRequest({ body: staffAuthValidation.changePasswordBody }),
  changeStaffPassword,
)
router.post(
  '/2fa/setup',
  authenticateTempToken,
  validateRequest({ body: staffAuthValidation.staffTwoFactorSetupBody }),
  setupTwoFactor,
)
router.post(
  '/2fa/enable',
  authenticateTempToken,
  validateRequest({ body: staffAuthValidation.staffTwoFactorEnableBody }),
  enableTwoFactor,
)
router.post(
  '/2fa/verify',
  authenticateTempToken,
  validateRequest({ body: staffAuthValidation.staffTwoFactorVerifyBody }),
  verifyTwoFactor,
)
router.post('/2fa/email/send', authenticateTempToken, sendStaffEmailOtp)
router.post(
  '/2fa/disable',
  authenticateStaff,
  validateRequest({ body: staffAuthValidation.disableTwoFactorBody }),
  disableTwoFactor,
)

export const staffAuthRouter = router
