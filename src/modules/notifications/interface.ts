import type { Types } from 'mongoose'

export enum NotificationType {
  BOOK_AVAILABLE = 'book_available',
  SUBSCRIPTION_EXPIRING = 'subscription_expiring',
  SUBSCRIPTION_RENEWED = 'subscription_renewed',
  REVIEW_RESPONSE = 'review_response',
  PROMOTION_NEW = 'promotion_new',
  SYSTEM_MESSAGE = 'system_message',
}

export interface INotification {
  _id: Types.ObjectId
  userId: Types.ObjectId
  type: NotificationType
  title: string
  body: string
  relatedEntityId?: Types.ObjectId | string
  relatedEntityType?: string
  read: boolean
  deliveredAt?: Date
  createdAt: Date
  updatedAt: Date
}
