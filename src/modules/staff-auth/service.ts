import type { Request, Response } from 'express'
import speakeasy from 'speakeasy'

import { AppError } from '../../common/errors/AppError'
import { emailService } from '../../common/services/email.service'
import {
  compareScryptHash,
  hashStringSha256,
  hashWithScrypt,
} from '../../common/utils/crypto'
import { createEmailOtp, verifyEmailOtp } from '../../common/utils/otp'
import {
  clearStaffRefreshCookie,
  clearStaffSessionCookie,
  generateStaffRefreshToken,
  signAccessToken,
  signTempToken,
  verifyStaffRefreshToken,
  verifyTempToken,
} from '../../common/utils/token'
import { config } from '../../config'
import { EmailOtpModel } from '../auth/emailOtp.model'
import { RoleModel } from '../rbac/model'
import { StaffModel } from '../staff/model'
import { staffService } from '../staff/service'
import { StaffActivityLogModel, StaffInviteTokenModel } from './model'

const logStaffActivity = async (
  staffId: string,
  action: string,
  request?: Request,
) => {
  await StaffActivityLogModel.create({
    staffId,
    action,
    ipAddress: request?.ip,
    userAgent: request?.header('user-agent'),
  })
}

const issueStaffToken = async (staffId: string): Promise<string> => {
  const staff = await StaffModel.findById(staffId)

  if (!staff || !staff.isActive) {
    throw new AppError('Staff account not found or inactive.', 401)
  }

  return signAccessToken(
    {
      id: staff._id.toString(),
      sub: staff._id.toString(),
      actorType: 'staff',
      type: 'staff',
      email: staff.email,
    },
    config.jwt.staffSecret,
    config.jwt.accessExpiresIn,
  )
}

const issueStaffTokens = async (
  staffId: string,
): Promise<{ accessToken: string; refreshToken: string }> => {
  const staff = await StaffModel.findById(staffId)

  if (!staff || !staff.isActive) {
    throw new AppError('Staff account not found or inactive.', 401)
  }

  const payload = {
    id: staff._id.toString(),
    sub: staff._id.toString(),
    actorType: 'staff' as const,
    type: 'staff' as const,
    email: staff.email,
  }

  return {
    accessToken: signAccessToken(
      payload,
      config.jwt.staffSecret,
      config.jwt.accessExpiresIn,
    ),
    refreshToken: generateStaffRefreshToken(payload),
  }
}

const assertStaffResendOtpWindow = async (staffId: string): Promise<void> => {
  const latestOtp = await EmailOtpModel.findOne({
    actorId: staffId,
    actorType: 'staff',
    purpose: 'password-reset',
  })
    .sort({ _id: -1 })
    .lean()

  if (!latestOtp) {
    return
  }

  const elapsedMs = Date.now() - new Date(latestOtp.createdAt).getTime()

  if (elapsedMs < 60_000) {
    throw new AppError('Please wait before requesting a new code', 429)
  }
}

const buildStaffAuthResponse = async (staffId: string) => {
  const staff = await StaffModel.findById(staffId)

  if (!staff || !staff.isActive) {
    throw new AppError('Staff account not found or inactive.', 401)
  }

  const role = staff.roleId ? await RoleModel.findById(staff.roleId) : null

  if (!staff.isSuperAdmin && !role) {
    throw new AppError('Staff role is not configured.', 500)
  }

  return {
    id: staff._id.toString(),
    name: staff.name,
    email: staff.email,
    role: staff.isSuperAdmin ? 'super-admin' : role!.name,
    ...(staff.roleId ? { roleId: staff.roleId.toString() } : {}),
    permissions: staff.isSuperAdmin ? ['*'] : role!.permissions,
    twoFactorEnabled: staff.twoFactor.enabled,
    isActive: staff.isActive,
    createdAt: staff.createdAt.toISOString(),
    updatedAt: staff.updatedAt.toISOString(),
  }
}

const buildQrCodeUrl = (otpauthUrl: string): string => {
  return `https://chart.googleapis.com/chart?chs=256x256&cht=qr&chl=${encodeURIComponent(otpauthUrl)}`
}

const verifyStaffTotp = (secret: string, otp: string): boolean => {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: otp,
    window: 1,
  })
}

export const staffAuthService = {
  login: async (
    payload: { email: string; password: string },
    request?: Request,
  ): Promise<
    | {
        requiresTwoFactor: false
        mustSetup2FA: true
        tempToken: string
      }
    | {
        requiresTwoFactor: true
        mustSetup2FA: false
        tempToken: string
      }
  > => {
    const staff = await StaffModel.findOne({ email: payload.email })

    if (!staff || !staff.isActive) {
      throw new AppError('Invalid staff credentials.', 401)
    }

    const isValidPassword = await compareScryptHash(
      payload.password,
      staff.passwordHash,
    )

    if (!isValidPassword) {
      throw new AppError('Invalid staff credentials.', 401)
    }

    await logStaffActivity(staff._id.toString(), 'staff.login', request)

    if (!staff.twoFactor.enabled) {
      const setupTokenExpiry =
        config.jwt.staffSetupTokenExpiresIn === '10m' ? '10m' : ('10m' as const)

      return {
        requiresTwoFactor: false,
        mustSetup2FA: true,
        tempToken: signTempToken(
          {
            id: staff._id.toString(),
            email: staff.email,
            actorType: 'staff',
            mustSetup2FA: true,
          },
          config.jwt.staffSecret,
          setupTokenExpiry,
        ),
      }
    }

    const challengeTokenExpiry =
      config.jwt.tempTokenExpiresIn === '5m' ? '5m' : ('5m' as const)

    return {
      requiresTwoFactor: true,
      mustSetup2FA: false,
      tempToken: signTempToken(
        {
          id: staff._id.toString(),
          email: staff.email,
          actorType: 'staff',
          pending2FA: true,
        },
        config.jwt.staffSecret,
        challengeTokenExpiry,
      ),
    }
  },

  acceptInvite: async (payload: { token: string; password: string }) => {
    const tokenHash = hashStringSha256(payload.token)
    const invite = await StaffInviteTokenModel.findOne({ tokenHash })

    if (!invite || invite.expiresAt.getTime() < Date.now() || invite.usedAt) {
      throw new AppError('Invitation token is invalid or expired.', 400)
    }

    await staffService.createStaffFromInvite({
      email: invite.email,
      name: invite.name,
      ...(invite.phone ? { phone: invite.phone } : {}),
      password: payload.password,
      roleId: invite.roleId.toString(),
    })

    invite.usedAt = new Date()
    await invite.save()

    return {
      success: true,
      message: 'Account created. Please login and setup 2FA.',
    }
  },

  logout: async (response: Response): Promise<void> => {
    clearStaffSessionCookie(response)
    clearStaffRefreshCookie(response)
  },

  getMyProfile: async (staffId: string) => {
    return buildStaffAuthResponse(staffId)
  },

  changeMyPassword: async (
    staffId: string,
    payload: { currentPassword: string; newPassword: string },
  ) => {
    const staff = await StaffModel.findById(staffId)

    if (!staff) {
      throw new AppError('Staff not found.', 404)
    }

    const isPasswordValid = await compareScryptHash(
      payload.currentPassword,
      staff.passwordHash,
    )

    if (!isPasswordValid) {
      throw new AppError('Current password is incorrect.', 401)
    }

    staff.passwordHash = await hashWithScrypt(payload.newPassword)
    await staff.save()
  },

  setupTwoFactor: async (staffId: string) => {
    const staff = await StaffModel.findById(staffId)

    if (!staff || !staff.isActive) {
      throw new AppError('Staff account not found or inactive.', 401)
    }

    const secret = speakeasy.generateSecret({
      name: `${config.oauth.twoFactorIssuer}:${staff.email}`,
      length: 20,
    })

    if (!secret.base32 || !secret.otpauth_url) {
      throw new AppError('Failed to generate 2FA setup secret.', 500)
    }

    staff.twoFactor.pendingSecret = secret.base32
    await staff.save()

    return {
      secret: secret.base32,
      qrCodeUrl: buildQrCodeUrl(secret.otpauth_url),
    }
  },

  enableTwoFactor: async (staffId: string, payload: { otp: string }) => {
    const staff = await StaffModel.findById(staffId)

    if (!staff || !staff.isActive) {
      throw new AppError('Staff account not found or inactive.', 401)
    }

    if (!staff.twoFactor.pendingSecret) {
      throw new AppError('2FA setup has not been initialized.', 400)
    }

    const isOtpValid = verifyStaffTotp(
      staff.twoFactor.pendingSecret,
      payload.otp,
    )

    if (!isOtpValid) {
      throw new AppError('Invalid 2FA code.', 401)
    }

    staff.twoFactor.enabled = true
    staff.twoFactor.secret = staff.twoFactor.pendingSecret
    staff.twoFactor.pendingSecret = undefined
    staff.twoFactor.lastVerifiedAt = new Date()
    await staff.save()

    const tokens = await issueStaffTokens(staff._id.toString())

    return {
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      staff: await buildStaffAuthResponse(staff._id.toString()),
    }
  },

  verifyTwoFactor: async (
    staffId: string,
    payload: { otp?: string; emailOtp?: string },
  ) => {
    const staff = await StaffModel.findById(staffId)

    if (!staff || !staff.isActive) {
      throw new AppError('Staff account not found or inactive.', 401)
    }

    if (!staff.twoFactor.enabled || !staff.twoFactor.secret) {
      throw new AppError('2FA is not enabled on this account.', 401)
    }

    const isOtpValid = payload.emailOtp
      ? await verifyEmailOtp(
          staff._id.toString(),
          'staff',
          'login',
          payload.emailOtp,
        )
      : payload.otp
        ? verifyStaffTotp(staff.twoFactor.secret, payload.otp)
        : false

    if (!isOtpValid) {
      throw new AppError('Invalid 2FA code.', 401)
    }

    staff.twoFactor.lastVerifiedAt = new Date()
    await staff.save()

    await logStaffActivity(staff._id.toString(), 'staff.2fa_verify')

    const tokens = await issueStaffTokens(staff._id.toString())

    return {
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      staff: await buildStaffAuthResponse(staff._id.toString()),
    }
  },

  sendStaffEmailOtp: async (staffId: string) => {
    const staff = await StaffModel.findById(staffId)

    if (!staff || !staff.isActive || !staff.twoFactor.enabled) {
      throw new AppError('Staff account not found or inactive.', 401)
    }

    const otp = await createEmailOtp(staff._id.toString(), 'staff', 'login')

    await emailService.sendEmail({
      to: staff.email,
      subject: 'Your Stackread staff login code',
      text: `Your login code is: ${otp}`,
    })

    return { sent: true }
  },

  disableTwoFactor: async () => {
    throw new AppError(
      'Staff 2FA cannot be disabled. Contact admin to reset.',
      403,
    )
  },

  forgotStaffPassword: async (email: string): Promise<{ sent: true }> => {
    const staff = await StaffModel.findOne({ email })

    if (!staff) {
      return { sent: true }
    }

    const otp = await createEmailOtp(
      staff._id.toString(),
      'staff',
      'password-reset',
    )

    await emailService.sendEmail({
      to: staff.email,
      subject: 'Stackread staff password reset code',
      text: `Your password reset code is: ${otp}`,
    })

    return { sent: true }
  },

  resendStaffResetOtp: async (email: string): Promise<{ sent: true }> => {
    const staff = await StaffModel.findOne({ email })

    if (!staff) {
      return { sent: true }
    }

    await assertStaffResendOtpWindow(staff._id.toString())

    await EmailOtpModel.deleteMany({
      actorId: staff._id,
      actorType: 'staff',
      purpose: 'password-reset',
      usedAt: null,
    })

    const otp = await createEmailOtp(
      staff._id.toString(),
      'staff',
      'password-reset',
    )

    await emailService.sendEmail({
      to: staff.email,
      subject: 'Stackread staff password reset code',
      text: `Your password reset code is: ${otp}`,
    })

    return { sent: true }
  },

  verifyStaffResetOtp: async (
    email: string,
    otp: string,
  ): Promise<{ resetToken: string }> => {
    const staff = await StaffModel.findOne({ email })

    if (!staff) {
      throw new AppError('Invalid or expired code', 400)
    }

    const isValid = await verifyEmailOtp(
      staff._id.toString(),
      'staff',
      'password-reset',
      otp,
    )

    if (!isValid) {
      throw new AppError('Invalid or expired code', 400)
    }

    const resetToken = signTempToken(
      {
        id: staff._id.toString(),
        email: staff.email,
        actorType: 'staff',
        purpose: 'password-reset',
      },
      config.jwt.staffSecret,
      '10m',
    )

    return { resetToken }
  },

  resetStaffPassword: async (
    resetToken: string,
    newPassword: string,
  ): Promise<{ success: true }> => {
    const decoded = verifyTempToken(resetToken, config.jwt.staffSecret)

    if (decoded.actorType !== 'staff' || decoded.purpose !== 'password-reset') {
      throw new AppError('Invalid password reset token', 400)
    }

    const staff = await StaffModel.findById(decoded.id)

    if (!staff) {
      throw new AppError('Staff not found.', 404)
    }

    staff.passwordHash = await hashWithScrypt(newPassword)
    await staff.save()

    await EmailOtpModel.deleteMany({
      actorId: staff._id,
      actorType: 'staff',
      purpose: 'password-reset',
    })

    return { success: true }
  },

  refreshSession: async (
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> => {
    const payload = verifyStaffRefreshToken(refreshToken)
    const staffId = payload.id ?? payload.sub

    if (!staffId) {
      throw new AppError('Unauthorized. Invalid refresh token.', 401)
    }

    const staff = await StaffModel.findById(staffId)

    if (!staff || !staff.isActive) {
      throw new AppError('Unauthorized. Invalid refresh token.', 401)
    }

    return issueStaffTokens(staff._id.toString())
  },
}
