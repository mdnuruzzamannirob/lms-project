import type { RequestHandler } from 'express'

import { AppError } from '../../common/errors/AppError'
import { catchAsync } from '../../common/utils/catchAsync'
import { getIdParam } from '../../common/utils/getParam'
import { sendResponse } from '../../common/utils/sendResponse'
import { staffService } from './service'
import { getActorId } from './utils'

const inviteStaff: RequestHandler = catchAsync(async (request, response) => {
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
})

const reinviteStaff: RequestHandler = catchAsync(async (request, response) => {
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
})

const listStaff: RequestHandler = catchAsync(async (_request, response) => {
  const data = await staffService.listStaff()

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Staff list retrieved successfully.',
    data,
  })
})

const getStaffById: RequestHandler = catchAsync(async (request, response) => {
  const data = await staffService.getStaffById(getIdParam(request))

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Staff profile retrieved successfully.',
    data,
  })
})

const getStaffActivity: RequestHandler = catchAsync(
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

const updateStaffRole: RequestHandler = catchAsync(
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

const suspendStaff: RequestHandler = catchAsync(async (request, response) => {
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
})

const unsuspendStaff: RequestHandler = catchAsync(async (request, response) => {
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
})

const removeStaff: RequestHandler = catchAsync(async (request, response) => {
  const staffId = getIdParam(request)
  const actorId = getActorId(request)

  if (!actorId) {
    throw new AppError('Staff authentication is required.', 401)
  }

  await staffService.removeStaff(staffId, actorId, actorId, request.id)

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Staff removed successfully.',
    data: null,
  })
})

const resetTwoFactor: RequestHandler = catchAsync(async (request, response) => {
  const staffId = getIdParam(request)
  const actorId = getActorId(request)

  if (!actorId) {
    throw new AppError('Staff authentication is required.', 401)
  }

  const data = await staffService.resetStaffTwoFactor(
    staffId,
    actorId,
    actorId,
    request.id,
  )

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Staff 2FA reset successfully.',
    data,
  })
})

export const staffController = {
  inviteStaff,
  reinviteStaff,
  listStaff,
  getStaffById,
  getStaffActivity,
  updateStaffRole,
  suspendStaff,
  unsuspendStaff,
  removeStaff,
  resetTwoFactor,
}
