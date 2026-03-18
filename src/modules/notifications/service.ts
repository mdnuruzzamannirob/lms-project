import { Types } from 'mongoose'

import { AppError } from '../../common/errors/AppError'
import {
  createPaginationMeta,
  getPaginationState,
} from '../../common/utils/pagination'
import type { INotification } from './interface'
import { NotificationModel } from './model'

const formatNotification = (notification: INotification | null): object => {
  if (!notification) {
    throw new AppError('Notification not found.', 404)
  }

  return {
    id: notification._id.toString(),
    userId: notification.userId.toString(),
    type: notification.type,
    title: notification.title,
    body: notification.body,
    relatedEntityId: notification.relatedEntityId
      ? notification.relatedEntityId.toString()
      : null,
    relatedEntityType: notification.relatedEntityType || null,
    read: notification.read,
    deliveredAt: notification.deliveredAt?.toISOString() || null,
    createdAt: notification.createdAt.toISOString(),
    updatedAt: notification.updatedAt.toISOString(),
  }
}

export const notificationsService = {
  getMyNotifications: async (
    userId: string,
    query: {
      page: number
      limit: number
      read?: string
    },
  ) => {
    const paginationState = getPaginationState(query)
    const { skip, limit } = paginationState

    const filter: Record<string, any> = {
      userId: new Types.ObjectId(userId),
    }

    if (query.read === 'true') {
      filter.read = true
    } else if (query.read === 'false') {
      filter.read = false
    }

    const [notifications, total] = await Promise.all([
      NotificationModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      NotificationModel.countDocuments(filter),
    ])

    const formatted = notifications.map((n) =>
      formatNotification(n as INotification),
    )

    return {
      data: formatted,
      meta: createPaginationMeta(paginationState, total),
    }
  },

  markAsRead: async (userId: string, notificationId: string) => {
    const notification = await NotificationModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(notificationId),
        userId: new Types.ObjectId(userId),
      },
      {
        read: true,
        deliveredAt: new Date(),
      },
      { new: true },
    )

    if (!notification) {
      throw new AppError('Notification not found or unauthorized.', 404)
    }

    return formatNotification(notification)
  },

  bulkMarkAsRead: async (userId: string, notificationIds: string[]) => {
    const objectIds = notificationIds.map((id) => new Types.ObjectId(id))

    const result = await NotificationModel.updateMany(
      {
        _id: { $in: objectIds },
        userId: new Types.ObjectId(userId),
      },
      {
        read: true,
        deliveredAt: new Date(),
      },
    )

    return {
      matched: result.matchedCount,
      updated: result.modifiedCount,
    }
  },

  getUnreadCount: async (userId: string) => {
    const count = await NotificationModel.countDocuments({
      userId: new Types.ObjectId(userId),
      read: false,
    })

    return { unreadCount: count }
  },

  bulkSend: async (payload: {
    userIds: string[]
    type: string
    title: string
    body: string
    relatedEntityId?: string
    relatedEntityType?: string
  }) => {
    const notifications = payload.userIds.map((userId) => ({
      userId: new Types.ObjectId(userId),
      type: payload.type,
      title: payload.title,
      body: payload.body,
      relatedEntityId: payload.relatedEntityId
        ? new Types.ObjectId(payload.relatedEntityId)
        : undefined,
      relatedEntityType: payload.relatedEntityType,
      read: false,
      deliveredAt: new Date(),
    }))

    const result = await NotificationModel.insertMany(notifications)

    return {
      sentCount: result.length,
      notificationIds: result.map((n) => n._id.toString()),
    }
  },

  createNotification: async (payload: {
    userId: string
    type: string
    title: string
    body: string
    relatedEntityId?: string
    relatedEntityType?: string
  }) => {
    const notification = await NotificationModel.create({
      userId: new Types.ObjectId(payload.userId),
      type: payload.type,
      title: payload.title,
      body: payload.body,
      relatedEntityId: payload.relatedEntityId
        ? new Types.ObjectId(payload.relatedEntityId)
        : undefined,
      relatedEntityType: payload.relatedEntityType,
      read: false,
      deliveredAt: new Date(),
    })

    return formatNotification(notification)
  },
}
