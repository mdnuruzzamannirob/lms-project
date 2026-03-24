import { catchAsync } from '../../common/utils/catchAsync'
import { getNotificationId, getUserId } from '../../common/utils/getId'
import { sendResponse } from '../../common/utils/sendResponse'
import { notificationsService } from './service'

const getMyNotifications = catchAsync(async (request: any, res: any) => {
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
})

const markAsRead = catchAsync(async (request: any, res: any) => {
  const userId = getUserId(request)
  const id = getNotificationId(request)

  const result = await notificationsService.markAsRead(userId, id)

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Notification marked as read.',
    data: result,
  })
})

const bulkMarkAsRead = catchAsync(async (request: any, res: any) => {
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
})

const getUnreadCount = catchAsync(async (request: any, res: any) => {
  const userId = getUserId(request)

  const result = await notificationsService.getUnreadCount(userId)

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Unread count retrieved successfully.',
    data: result,
  })
})

const bulkSend = catchAsync(async (request: any, res: any) => {
  const payload = request.body

  const result = await notificationsService.bulkSend(payload)

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Notifications sent successfully.',
    data: result,
  })
})

export const notificationsController = {
  getMyNotifications,
  markAsRead,
  bulkMarkAsRead,
  getUnreadCount,
  bulkSend,
}
