import type { Types } from 'mongoose'

export interface IReview {
  _id: Types.ObjectId
  userId: Types.ObjectId
  bookId: Types.ObjectId
  rating: number
  title: string | undefined
  comment: string
  isVisible: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ReviewCreatePayload {
  rating: number
  title?: string
  comment: string
}

export type ReviewUpdatePayload = Partial<ReviewCreatePayload>

export interface ReviewListQuery {
  page?: number
  limit?: number
}

export interface ReviewAdminListQuery extends ReviewListQuery {
  bookId?: string
  userId?: string
  isVisible?: boolean
}
