import type { RequestHandler } from 'express'

import { AppError } from '../../common/errors/AppError'
import { catchAsync } from '../../common/utils/catchAsync'
import { sendResponse } from '../../common/utils/sendResponse'
import { rbacService } from './service'

const getIdParam = (request: Parameters<RequestHandler>[0]): string => {
  const id = request.params.id

  if (typeof id !== 'string') {
    throw new AppError('Invalid id parameter.', 400)
  }

  return id
}

export const listPermissions: RequestHandler = catchAsync(
  async (_request, response) => {
    const data = await rbacService.listPermissions()

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Permissions retrieved successfully.',
      data,
    })
  },
)

export const listRoles: RequestHandler = catchAsync(
  async (_request, response) => {
    const data = await rbacService.listRoles()

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Roles retrieved successfully.',
      data,
    })
  },
)

export const getRoleById: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await rbacService.getRoleById(getIdParam(request))

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Role retrieved successfully.',
      data,
    })
  },
)

export const createRole: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await rbacService.createRole(request.body)

    sendResponse(response, {
      statusCode: 201,
      success: true,
      message: 'Role created successfully.',
      data,
    })
  },
)

export const updateRole: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await rbacService.updateRole(getIdParam(request), request.body)

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Role updated successfully.',
      data,
    })
  },
)

export const deleteRole: RequestHandler = catchAsync(
  async (request, response) => {
    await rbacService.deleteRole(getIdParam(request))

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Role deleted successfully.',
      data: null,
    })
  },
)
