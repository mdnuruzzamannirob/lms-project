import type { RequestHandler } from 'express'

import { UserModel } from '../../modules/auth/model'
import { RoleModel } from '../../modules/rbac/model'
import { StaffModel } from '../../modules/staff/model'
import { AppError } from '../errors/AppError'
import {
  extractBearerToken,
  getCookieValueFromHeader,
  verifyAccessToken,
} from '../utils/token'

const USER_SESSION_COOKIE_NAME =
  process.env.SESSION_COOKIE_NAME ?? 'stackread_session'
const STAFF_SESSION_COOKIE_NAME =
  process.env.STAFF_SESSION_COOKIE_NAME ?? 'stackread_staff_session'

const resolveTokenFromRequest = (
  cookieHeader: string | undefined,
  authorizationHeader: string | undefined,
  cookieName: string,
): string => {
  const cookieToken = getCookieValueFromHeader(cookieHeader, cookieName)

  if (cookieToken) {
    return cookieToken
  }

  const token = extractBearerToken(authorizationHeader)

  if (!token) {
    throw new AppError('Unauthorized. Bearer token is required.', 401)
  }

  return token
}

export const authenticateUser: RequestHandler = async (
  request,
  _response,
  next,
) => {
  try {
    const token = resolveTokenFromRequest(
      request.header('cookie'),
      request.header('authorization'),
      USER_SESSION_COOKIE_NAME,
    )
    const payload = verifyAccessToken(token, 'user')

    const userId = payload.id ?? payload.sub

    if (!userId) {
      throw new AppError('Unauthorized. Invalid or expired user token.', 401)
    }

    const user = await UserModel.findById(userId)
      .select('_id email isActive isSuspended deletedAt')
      .lean()

    if (!user || !user.isActive || user.isSuspended || user.deletedAt) {
      throw new AppError('Unauthorized. Invalid or expired user token.', 401)
    }

    request.auth = payload
    next()
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError('Unauthorized. Invalid or expired user token.', 401),
    )
  }
}

export const authenticateStaff: RequestHandler = async (
  request,
  _response,
  next,
) => {
  try {
    const token = resolveTokenFromRequest(
      request.header('cookie'),
      request.header('authorization'),
      STAFF_SESSION_COOKIE_NAME,
    )
    const payload = verifyAccessToken(token, 'staff')
    const staffId = payload.id ?? payload.sub

    if (!staffId) {
      throw new AppError('Unauthorized. Invalid or expired staff token.', 401)
    }

    const staff = await StaffModel.findById(staffId)
      .select('_id email roleId isSuperAdmin isActive')
      .lean()

    if (!staff || !staff.isActive) {
      throw new AppError('Unauthorized. Invalid or expired staff token.', 401)
    }

    if (staff.isSuperAdmin) {
      request.auth = {
        ...payload,
        id: staff._id.toString(),
        sub: staff._id.toString(),
        email: staff.email,
        ...(staff.roleId ? { roleId: staff.roleId.toString() } : {}),
        role: 'super-admin',
        permissions: ['*'],
        isSuperAdmin: true,
        type: 'staff',
        actorType: 'staff',
      }

      next()
      return
    }

    if (!staff.roleId) {
      throw new AppError('Unauthorized. Invalid or expired staff token.', 401)
    }

    const role = await RoleModel.findById(staff.roleId)
      .select('name permissions')
      .lean()

    if (!role) {
      throw new AppError('Unauthorized. Invalid or expired staff token.', 401)
    }

    request.auth = {
      ...payload,
      id: staff._id.toString(),
      sub: staff._id.toString(),
      email: staff.email,
      roleId: staff.roleId.toString(),
      role: role.name,
      permissions: role.permissions,
      isSuperAdmin: false,
      type: 'staff',
      actorType: 'staff',
    }

    next()
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError('Unauthorized. Invalid or expired staff token.', 401),
    )
  }
}

export const optionalAuth: RequestHandler = (request, _response, next) => {
  try {
    const token =
      getCookieValueFromHeader(
        request.header('cookie'),
        USER_SESSION_COOKIE_NAME,
      ) ?? extractBearerToken(request.header('authorization'))

    if (!token) {
      next()
      return
    }

    try {
      request.auth = verifyAccessToken(token, 'user')
    } catch {
      next()
      return
    }

    next()
  } catch {
    next()
  }
}
