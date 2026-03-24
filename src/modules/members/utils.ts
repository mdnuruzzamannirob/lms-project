import type { RequestHandler } from 'express'

import { AppError } from '../../common/errors/AppError'

export const getUserIdParam = (
  request: Parameters<RequestHandler>[0],
): string => {
  const id = request.params.userId
  if (typeof id !== 'string') {
    throw new AppError('Invalid user id parameter.', 400)
  }
  return id
}

export const getActorId = (
  request: Parameters<RequestHandler>[0],
): string | undefined => {
  if (request.auth?.type !== 'staff') {
    return undefined
  }

  return request.auth.sub
}

export const formatMember = (user: any, stats: any): object => {
  return {
    id: user._id.toString(),
    email: user.email,
    firstName: user.firstName || null,
    lastName: user.lastName || null,
    phone: user.phone || null,
    profilePicture: user.profilePicture || null,
    isSuspended: user.isSuspended || false,
    suspendedAt: user.suspendedAt?.toISOString() || null,
    suspensionReason: user.suspensionReason || null,
    joinDate: user.createdAt?.toISOString() || null,
    lastLoginAt: user.lastLoginAt?.toISOString() || null,
    totalBooksRead: stats?.booksRead || 0,
    totalAmountSpent: stats?.totalSpent || 0,
    totalOrders: stats?.orderCount || 0,
  }
}
