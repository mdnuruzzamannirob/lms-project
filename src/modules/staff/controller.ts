import type { RequestHandler } from 'express'

import { AppError } from '../../common/errors/AppError'
import { catchAsync } from '../../common/utils/catchAsync'
import { sendResponse } from '../../common/utils/sendResponse'
import { staffService } from './service'

const getActorId = (
  request: Parameters<RequestHandler>[0],
): string | undefined => {
  if (request.auth?.type !== 'staff') {
    return undefined
  }

  return request.auth.sub
}

const getIdParam = (request: Parameters<RequestHandler>[0]): string => {
  const id = request.params.id

  if (typeof id !== 'string') {
    throw new AppError('Invalid id parameter.', 400)
  }

  return id
}

export const inviteStaff: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await staffService.inviteStaff(
      request.body,
      getActorId(request),
      request.id,
    )

    sendResponse(response, {
      statusCode: 201,
      success: true,
      message: 'Staff invitation sent successfully.',
      data,
    })
  },
)

export const reinviteStaff: RequestHandler = catchAsync(
  async (request, response) => {
    const staffId = getIdParam(request)
    const data = await staffService.reinviteStaff(
      staffId,
      getActorId(request),
      request.id,
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Staff invitation resent successfully.',
      data,
    })
  },
)

export const listStaff: RequestHandler = catchAsync(
  async (_request, response) => {
    const data = await staffService.listStaff()

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Staff list retrieved successfully.',
      data,
    })
  },
)

export const getStaffById: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await staffService.getStaffById(getIdParam(request))

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Staff profile retrieved successfully.',
      data,
    })
  },
)

export const getStaffActivity: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await staffService.getStaffActivity(getIdParam(request))

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Staff activity retrieved successfully.',
      data,
    })
  },
)

export const updateStaffRole: RequestHandler = catchAsync(
  async (request, response) => {
    const staffId = getIdParam(request)
    const data = await staffService.updateStaffRole(
      staffId,
      request.body.roleId,
      getActorId(request),
      request.id,
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Staff role updated successfully.',
      data,
    })
  },
)

export const suspendStaff: RequestHandler = catchAsync(
  async (request, response) => {
    const staffId = getIdParam(request)
    const actorId = getActorId(request)

    if (actorId === staffId) {
      throw new AppError('You cannot suspend yourself.', 400)
    }

    const data = await staffService.suspendStaff(staffId, actorId, request.id)

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Staff suspended successfully.',
      data,
    })
  },
)

export const unsuspendStaff: RequestHandler = catchAsync(
  async (request, response) => {
    const staffId = getIdParam(request)
    const data = await staffService.unsuspendStaff(
      staffId,
      getActorId(request),
      request.id,
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Staff unsuspended successfully.',
      data,
    })
  },
)

export const removeStaff: RequestHandler = catchAsync(
  async (request, response) => {
    const staffId = getIdParam(request)
    const actorId = getActorId(request)

    if (actorId === staffId) {
      throw new AppError('You cannot delete yourself.', 400)
    }

    await staffService.removeStaff(staffId, actorId, request.id)

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Staff removed successfully.',
      data: null,
    })
  },
)
