import type { Request } from 'express'
import speakeasy from 'speakeasy'

import { AppError } from '../../common/errors/AppError'
import { auditService } from '../../common/services/audit.service'
import {
  compareScryptHash,
  generateRandomToken,
  hashStringSha256,
  hashWithScrypt,
} from '../../common/utils/crypto'
import { signAccessToken } from '../../common/utils/token'
import { config } from '../../config'
import { RoleModel } from '../rbac/model'
import { StaffModel } from '../staff/model'
import { staffService } from '../staff/service'
import {
  StaffActivityLogModel,
  StaffInviteTokenModel,
  StaffTwoFactorChallengeModel,
} from './model'

const issueStaffToken = async (staffId: string): Promise<string> => {
  const staff = await StaffModel.findById(staffId)

  if (!staff || !staff.isActive) {
    throw new AppError('Staff account not found or inactive.', 401)
  }

  const role = await RoleModel.findById(staff.roleId)

  if (!role) {
    throw new AppError('Staff role is not configured.', 500)
  }

  return signAccessToken({
    sub: staff._id.toString(),
    type: 'staff',
    email: staff.email,
    role: staff.isSuperAdmin ? 'super-admin' : role.name,
    permissions: staff.isSuperAdmin ? ['*'] : role.permissions,
  })
}

const createTwoFactorChallenge = async (staffId: string): Promise<string> => {
  const rawToken = generateRandomToken(20)
  const tokenHash = hashStringSha256(rawToken)

  await StaffTwoFactorChallengeModel.deleteMany({
    staffId,
    consumedAt: { $exists: false },
  })
  await StaffTwoFactorChallengeModel.create({
    staffId,
    tokenHash,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  })

  return signAccessToken({
    sub: staffId,
    type: 'staff',
    role: 'staff.2fa.pending',
    permissions: ['staff.2fa.pending'],
  })
}

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

export const staffAuthService = {
  login: async (
    payload: { email: string; password: string },
    request?: Request,
  ): Promise<
    | {
        requiresTwoFactor: false
        accessToken: string
      }
    | {
        requiresTwoFactor: true
        twoFactorToken: string
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

    if (staff.twoFactor.enabled) {
      const twoFactorToken = await createTwoFactorChallenge(
        staff._id.toString(),
      )

      return {
        requiresTwoFactor: true,
        twoFactorToken,
      }
    }

    return {
      requiresTwoFactor: false,
      accessToken: await issueStaffToken(staff._id.toString()),
    }
  },

  acceptInvite: async (payload: { token: string; password: string }) => {
    const tokenHash = hashStringSha256(payload.token)
    const invite = await StaffInviteTokenModel.findOne({ tokenHash })

    if (!invite || invite.expiresAt.getTime() < Date.now() || invite.usedAt) {
      throw new AppError('Invitation token is invalid or expired.', 400)
    }

    const staff = await staffService.createStaffFromInvite({
      email: invite.email,
      name: invite.name,
      ...(invite.phone ? { phone: invite.phone } : {}),
      password: payload.password,
      roleId: invite.roleId.toString(),
    })

    invite.usedAt = new Date()
    await invite.save()

    return {
      staff,
      accessToken: await issueStaffToken(staff.id),
    }
  },

  logout: async (): Promise<void> => {
    return
  },

  getMyProfile: async (staffId: string) => {
    const staff = await StaffModel.findById(staffId)

    if (!staff) {
      throw new AppError('Staff not found.', 404)
    }

    const role = await RoleModel.findById(staff.roleId)

    if (!role) {
      throw new AppError('Staff role not found.', 404)
    }

    return {
      id: staff._id.toString(),
      name: staff.name,
      email: staff.email,
      role: staff.isSuperAdmin ? 'super-admin' : role.name,
      permissions: staff.isSuperAdmin ? ['*'] : role.permissions,
      twoFactorEnabled: staff.twoFactor.enabled,
      isSuperAdmin: staff.isSuperAdmin,
      isActive: staff.isActive,
      createdAt: staff.createdAt.toISOString(),
      updatedAt: staff.updatedAt.toISOString(),
    }
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

  enableTwoFactor: async (staffId: string) => {
    const staff = await StaffModel.findById(staffId)

    if (!staff) {
      throw new AppError('Staff not found.', 404)
    }

    const secret = speakeasy.generateSecret({
      name: `${config.oauth.twoFactorIssuer}:${staff.email}`,
      length: 20,
    })

    staff.twoFactor.pendingSecret = secret.base32
    await staff.save()

    return {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url,
    }
  },

  verifyTwoFactor: async (staffId: string, code: string, request?: Request) => {
    const staff = await StaffModel.findById(staffId)

    if (!staff) {
      throw new AppError('Staff not found.', 404)
    }

    const pendingSecret = staff.twoFactor.pendingSecret

    if (pendingSecret) {
      const isSetupCodeValid = speakeasy.totp.verify({
        secret: pendingSecret,
        encoding: 'base32',
        token: code,
        window: 1,
      })

      if (!isSetupCodeValid) {
        throw new AppError('Invalid 2FA setup code.', 400)
      }

      staff.twoFactor.enabled = true
      staff.twoFactor.secret = pendingSecret
      staff.twoFactor.pendingSecret = undefined
      staff.twoFactor.lastVerifiedAt = new Date()
      await staff.save()
      await logStaffActivity(staff._id.toString(), 'staff.2fa.enabled', request)

      return {
        enabled: true,
        accessToken: await issueStaffToken(staff._id.toString()),
      }
    }

    if (!staff.twoFactor.enabled || !staff.twoFactor.secret) {
      throw new AppError('2FA is not enabled for this staff account.', 400)
    }

    const isCodeValid = speakeasy.totp.verify({
      secret: staff.twoFactor.secret,
      encoding: 'base32',
      token: code,
      window: 1,
    })

    if (!isCodeValid) {
      throw new AppError('Invalid 2FA code.', 401)
    }

    staff.twoFactor.lastVerifiedAt = new Date()
    await staff.save()
    await logStaffActivity(staff._id.toString(), 'staff.2fa.verified', request)

    return {
      enabled: true,
      accessToken: await issueStaffToken(staff._id.toString()),
    }
  },

  disableTwoFactor: async (
    staffId: string,
    payload: { password: string; code: string },
    request?: Request,
  ) => {
    const staff = await StaffModel.findById(staffId)

    if (!staff || !staff.twoFactor.enabled || !staff.twoFactor.secret) {
      throw new AppError('2FA is not enabled for this staff account.', 400)
    }

    const isPasswordValid = await compareScryptHash(
      payload.password,
      staff.passwordHash,
    )

    if (!isPasswordValid) {
      throw new AppError('Password is incorrect.', 401)
    }

    const isCodeValid = speakeasy.totp.verify({
      secret: staff.twoFactor.secret,
      encoding: 'base32',
      token: payload.code,
      window: 1,
    })

    if (!isCodeValid) {
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
      enabled: false,
    }
  },
}
