import { AppError } from '../../common/errors/AppError'
import { INotification } from './interface'

export const formatNotification = (
  notification: INotification | null,
): object => {
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
