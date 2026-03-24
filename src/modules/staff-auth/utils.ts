import type { Request, RequestHandler } from 'express'

import speakeasy from 'speakeasy'
import { AppError } from '../../common/errors/AppError'
import {
  generateStaffRefreshToken,
  signAccessToken,
} from '../../common/utils/token'
import { config } from '../../config'
import { EmailOtpModel } from '../auth'
import { RoleModel } from '../rbac'
import { StaffModel } from '../staff'
import { StaffActivityLogModel } from './model'

export const STAFF_REFRESH_COOKIE_NAME = 'stackread_staff_refresh'

export const getStaffIdFromAuth = (
  request: Parameters<RequestHandler>[0],
): string => {
  if (!request.auth || request.auth.type !== 'staff') {
    throw new AppError('Staff authentication is required.', 401)
  }

  return request.auth.sub
}

export const logStaffActivity = async (
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

export const issueStaffTokens = async (
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

export const assertStaffResendOtpWindow = async (
  staffId: string,
): Promise<void> => {
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

export const buildStaffAuthResponse = async (staffId: string) => {
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

export const verifyStaffTotp = (secret: string, otp: string): boolean => {
  if (!secret || !otp) {
    return false
  }

  return speakeasy.totp.verify({
    secret: secret.trim(),
    encoding: 'base32',
    token: otp.trim(),
    window: 2, // Allow ±2 time windows for time sync tolerance
  })
}
