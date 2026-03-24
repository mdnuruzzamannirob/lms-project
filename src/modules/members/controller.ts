import { catchAsync } from '../../common/utils/catchAsync'
import { sendResponse } from '../../common/utils/sendResponse'
import { membersService } from './service'
import { getActorId, getUserIdParam } from './utils'

const listMembers = catchAsync(async (request: any, res: any) => {
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
})

const getMemberDetail = catchAsync(async (request: any, res: any) => {
  const userId = getUserIdParam(request)

  const result = await membersService.getMemberDetail(userId)

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Member detail retrieved successfully.',
    data: result,
  })
})

const suspendMember = catchAsync(async (request: any, res: any) => {
  const userId = getUserIdParam(request)
  const { reason } = request.body

  const result = await membersService.suspendMember(
    userId,
    reason,
    getActorId(request),
    request.id,
  )

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Member suspended successfully.',
    data: result,
  })
})

const unsuspendMember = catchAsync(async (request: any, res: any) => {
  const userId = getUserIdParam(request)

  const result = await membersService.unsuspendMember(
    userId,
    getActorId(request),
    request.id,
  )

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Member unsuspend successfully.',
    data: result,
  })
})

const deleteMember = catchAsync(async (request: any, res: any) => {
  const userId = getUserIdParam(request)

  const result = await membersService.deleteMember(
    userId,
    getActorId(request),
    request.id,
  )

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Member deleted successfully.',
    data: result,
  })
})

const getMemberReadingHistory = catchAsync(async (request: any, res: any) => {
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
})

const getMemberPaymentHistory = catchAsync(async (request: any, res: any) => {
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
})

export const membersController = {
  listMembers,
  getMemberDetail,
  suspendMember,
  unsuspendMember,
  deleteMember,
  getMemberReadingHistory,
  getMemberPaymentHistory,
}
