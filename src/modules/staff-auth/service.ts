import type { Request } from 'express'
import speakeasy from 'speakeasy'

import { AppError } from '../../common/errors/AppError'
import { auditService } from '../../common/services/audit.service'
import {
  compareScryptHash,
  hashStringSha256,
  hashWithScrypt,
} from '../../common/utils/crypto'
import {
  signAccessToken,
  signTempToken,
  verifyTempToken,
} from '../../common/utils/token'
import { config } from '../../config'
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

  const role = await RoleModel.findById(staff.roleId)

  if (!role) {
    throw new AppError('Staff role is not configured.', 500)
  }

  return signAccessToken(
    {
      id: staff._id.toString(),
      sub: staff._id.toString(),
      actorType: 'staff',
      type: 'staff',
      email: staff.email,
      roleId: staff.roleId.toString(),
      role: staff.isSuperAdmin ? 'super-admin' : role.name,
      permissions: staff.isSuperAdmin ? ['*'] : role.permissions,
    },
    config.jwt.staffSecret,
    config.jwt.accessExpiresIn,
  )
}

const buildStaffAuthResponse = async (staffId: string) => {
  const staff = await StaffModel.findById(staffId)

  if (!staff || !staff.isActive) {
    throw new AppError('Staff account not found or inactive.', 401)
  }

  const role = await RoleModel.findById(staff.roleId)

  if (!role) {
    throw new AppError('Staff role is not configured.', 500)
  }

  return {
    id: staff._id.toString(),
    name: staff.name,
    email: staff.email,
    role: staff.isSuperAdmin ? 'super-admin' : role.name,
    roleId: staff.roleId.toString(),
    permissions: staff.isSuperAdmin ? ['*'] : role.permissions,
    twoFactorEnabled: staff.twoFactor.enabled,
    isSuperAdmin: staff.isSuperAdmin,
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

  logout: async (): Promise<void> => {
    return
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

    return {
      token: await issueStaffToken(staff._id.toString()),
      staff: await buildStaffAuthResponse(staff._id.toString()),
    }
  },

  verifyTwoFactor: async (staffId: string, payload: { otp: string }) => {
    const staff = await StaffModel.findById(staffId)

    if (!staff || !staff.isActive) {
      throw new AppError('Staff account not found or inactive.', 401)
    }

    if (!staff.twoFactor.enabled || !staff.twoFactor.secret) {
      throw new AppError('2FA is not enabled on this account.', 401)
    }

    const isOtpValid = verifyStaffTotp(staff.twoFactor.secret, payload.otp)

    if (!isOtpValid) {
      throw new AppError('Invalid 2FA code.', 401)
    }

    staff.twoFactor.lastVerifiedAt = new Date()
    await staff.save()

    await logStaffActivity(staff._id.toString(), 'staff.2fa_verify')

    return {
      token: await issueStaffToken(staff._id.toString()),
      staff: await buildStaffAuthResponse(staff._id.toString()),
    }
  },

  disableTwoFactor: async (
    staffId: string,
    payload: { otp: string },
    request?: Request,
  ) => {
    const staff = await StaffModel.findById(staffId)

    if (!staff) {
      throw new AppError('Staff not found.', 404)
    }

    if (!staff.isSuperAdmin) {
      throw new AppError('Only super-admin can disable their own 2FA.', 403)
    }

    if (!staff.twoFactor.enabled || !staff.twoFactor.secret) {
      throw new AppError('2FA is not enabled for this staff account.', 400)
    }

    const isOtpValid = verifyStaffTotp(staff.twoFactor.secret, payload.otp)

    if (!isOtpValid) {
      throw new AppError('Invalid 2FA code.', 401)
    }

    staff.twoFactor.enabled = false
    staff.twoFactor.secret = undefined
    staff.twoFactor.pendingSecret = undefined
    staff.twoFactor.lastVerifiedAt = new Date()
    await staff.save()
    await logStaffActivity(staff._id.toString(), 'staff.2fa.disabled', request)

    await auditService.logEvent({
      actor: { id: staff._id.toString(), type: 'staff', email: staff.email },
      action: 'staff.2fa.disable',
      module: 'staff-auth',
      targetId: staff._id.toString(),
      targetType: 'staff',
      description: 'Staff disabled 2FA.',
      ...(request?.id ? { requestId: request.id } : {}),
    })

    return {
      success: true,
    }
  },
}
