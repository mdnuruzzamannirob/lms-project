import type { RequestHandler } from 'express'

import { catchAsync } from '../../common/utils/catchAsync'
import { getIdParam } from '../../common/utils/getParam'
import { sendResponse } from '../../common/utils/sendResponse'
import { rbacService } from './service'

const listPermissions: RequestHandler = catchAsync(
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

const listRoles: RequestHandler = catchAsync(async (_request, response) => {
  const data = await rbacService.listRoles()

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Roles retrieved successfully.',
    data,
  })
})

const getRoleById: RequestHandler = catchAsync(async (request, response) => {
  const data = await rbacService.getRoleById(getIdParam(request))

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Role retrieved successfully.',
    data,
  })
})

const createRole: RequestHandler = catchAsync(async (request, response) => {
  const data = await rbacService.createRole(request.body)

  sendResponse(response, {
    statusCode: 201,
    success: true,
    message: 'Role created successfully.',
    data,
  })
})

const updateRole: RequestHandler = catchAsync(async (request, response) => {
  const data = await rbacService.updateRole(getIdParam(request), request.body)

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Role updated successfully.',
    data,
  })
})

const deleteRole: RequestHandler = catchAsync(async (request, response) => {
  await rbacService.deleteRole(getIdParam(request))

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Role deleted successfully.',
    data: null,
  })
})

export const rbacController = {
  listPermissions,
  listRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
}
