import type { RequestHandler } from 'express'

import { AppError } from '../../common/errors/AppError'
import { catchAsync } from '../../common/utils/catchAsync'
import { sendResponse } from '../../common/utils/sendResponse'
import { membersService } from './service'

const getUserIdParam = (request: Parameters<RequestHandler>[0]): string => {
  const id = request.params.userId
  if (typeof id !== 'string') {
    throw new AppError('Invalid user id parameter.', 400)
  }
  return id
}

export const membersController = {
  listMembers: catchAsync(async (request: any, res: any) => {
    const query = request.query as any

    const result = await membersService.listMembers({
      page: query.page || 1,
      limit: query.limit || 10,
      search: query.search,
      isSuspended: query.isSuspended,
    })

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Members retrieved successfully.',
      data: result.data,
      meta: result.meta,
    })
  }) as RequestHandler,

  getMemberDetail: catchAsync(async (request: any, res: any) => {
    const userId = getUserIdParam(request)

    const result = await membersService.getMemberDetail(userId)

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Member detail retrieved successfully.',
      data: result,
    })
  }) as RequestHandler,

  suspendMember: catchAsync(async (request: any, res: any) => {
    const userId = getUserIdParam(request)
    const { reason } = request.body

    const result = await membersService.suspendMember(userId, reason)

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Member suspended successfully.',
      data: result,
    })
  }) as RequestHandler,

  unsuspendMember: catchAsync(async (request: any, res: any) => {
    const userId = getUserIdParam(request)

    const result = await membersService.unsuspendMember(userId)

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Member unsuspended successfully.',
      data: result,
    })
  }) as RequestHandler,

  getMemberReadingHistory: catchAsync(async (request: any, res: any) => {
    const userId = getUserIdParam(request)
    const query = request.query as any

    const result = await membersService.getMemberReadingHistory(userId, {
      status: query.status || 'all',
      page: query.page || 1,
      limit: query.limit || 10,
    })

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Member reading history retrieved successfully.',
      data: result.data,
      meta: result.meta,
    })
  }) as RequestHandler,

  getMemberPaymentHistory: catchAsync(async (request: any, res: any) => {
    const userId = getUserIdParam(request)
    const query = request.query as any

    const result = await membersService.getMemberPaymentHistory(userId, {
      page: query.page || 1,
      limit: query.limit || 10,
    })

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Member payment history retrieved successfully.',
      data: result.data,
      meta: result.meta,
    })
  }) as RequestHandler,
}
