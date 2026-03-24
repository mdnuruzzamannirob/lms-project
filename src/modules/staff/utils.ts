import type { RequestHandler } from 'express'
import { AppError } from '../../common/errors/AppError'
import { IStaff } from './interface'

export const getActorId = (
  request: Parameters<RequestHandler>[0],
): string | undefined => {
  if (request.auth?.type !== 'staff') {
    return undefined
  }

  return request.auth.sub
}

export const buildStaffSummary = (staff: IStaff | null) => {
  if (!staff) {
    throw new AppError('Staff not found.', 404)
  }

  return {
    id: staff._id.toString(),
    name: staff.name,
    email: staff.email,
    phone: staff.phone,
    ...(staff.roleId ? { roleId: staff.roleId.toString() } : {}),
    isActive: staff.isActive,
    twoFactorEnabled: staff.twoFactor.enabled,
    createdAt: staff.createdAt.toISOString(),
    updatedAt: staff.updatedAt.toISOString(),
  }
}
