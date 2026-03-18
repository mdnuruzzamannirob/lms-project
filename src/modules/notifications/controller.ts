import type { RequestHandler } from 'express'

import { AppError } from '../../common/errors/AppError'
import { catchAsync } from '../../common/utils/catchAsync'
import { sendResponse } from '../../common/utils/sendResponse'
import { notificationsService } from './service'

const getUserId = (request: Parameters<RequestHandler>[0]): string => {
  const id = (request as any).user?.id
  if (typeof id !== 'string') {
    throw new AppError('User authentication is required.', 401)
  }
  return id
}

const getNotificationId = (
  request: Parameters<RequestHandler>[0],
): string => {
  const id = request.params.id
  if (typeof id !== 'string') {
    throw new AppError('Invalid notification id parameter.', 400)
  }
  return id
}

export const notificationsController = {
  getMyNotifications: catchAsync(async (request: any, res: any) => {
    const userId = getUserId(request)
    const query = request.query as any

    const result = await notificationsService.getMyNotifications(userId, {
      page: query.page || 1,
      limit: query.limit || 10,
      read: query.read,
    })

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Notifications retrieved successfully.',
      data: result.data,
      meta: result.meta,
    })
  }) as RequestHandler,

  markAsRead: catchAsync(async (request: any, res: any) => {
    const userId = getUserId(request)
    const id = getNotificationId(request)

    const result = await notificationsService.markAsRead(userId, id)

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Notification marked as read.',
      data: result,
    })
  }) as RequestHandler,

  bulkMarkAsRead: catchAsync(async (request: any, res: any) => {
    const userId = getUserId(request)
    const { notificationIds } = request.body

    const result = await notificationsService.bulkMarkAsRead(
      userId,
      notificationIds,
    )

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Notifications marked as read.',
      data: result,
    })
  }) as RequestHandler,

  getUnreadCount: catchAsync(async (request: any, res: any) => {
    const userId = getUserId(request)

    const result = await notificationsService.getUnreadCount(userId)

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Unread count retrieved successfully.',
      data: result,
    })
  }) as RequestHandler,

  bulkSend: catchAsync(async (request: any, res: any) => {
    const payload = request.body

    const result = await notificationsService.bulkSend(payload)

    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: 'Notifications sent successfully.',
      data: result,
    })
  }) as RequestHandler,
}
