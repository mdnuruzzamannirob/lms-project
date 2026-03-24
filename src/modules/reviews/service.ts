import { Types } from 'mongoose'

import { AppError } from '../../common/errors/AppError'
import {
  createPaginationMeta,
  getPaginationState,
} from '../../common/utils/pagination'
import { ReviewModel } from './model'
import {
  ensureBookExists,
  formatReview,
  recomputeBookReviewStats,
} from './utils'

const createReview = async (
  userId: string,
  bookId: string,
  payload: {
    rating: number
    title?: string
    comment: string
  },
) => {
  await ensureBookExists(bookId)

  const existing = await ReviewModel.findOne({ userId, bookId })

  if (existing) {
    throw new AppError('You already reviewed this book.', 409)
  }

  const review = await ReviewModel.create({
    userId: new Types.ObjectId(userId),
    bookId: new Types.ObjectId(bookId),
    rating: payload.rating,
    title: payload.title,
    comment: payload.comment,
    isVisible: true,
  })

  const metrics = await recomputeBookReviewStats(bookId)

  return {
    review: formatReview(review),
    metrics,
  }
}

const updateReview = async (
  userId: string,
  bookId: string,
  reviewId: string,
  payload: Partial<{
    rating: number
    title: string
    comment: string
  }>,
) => {
  await ensureBookExists(bookId)

  const review = await ReviewModel.findOne({
    _id: reviewId,
    userId: new Types.ObjectId(userId),
    bookId: new Types.ObjectId(bookId),
  })

  if (!review) {
    throw new AppError('Review not found.', 404)
  }

  if (typeof payload.rating === 'number') {
    review.rating = payload.rating
  }

  if (typeof payload.title === 'string') {
    review.title = payload.title
  }

  if (typeof payload.comment === 'string') {
    review.comment = payload.comment
  }

  await review.save()

  const metrics = await recomputeBookReviewStats(bookId)

  return {
    review: formatReview(review),
    metrics,
  }
}

const deleteReview = async (
  userId: string,
  bookId: string,
  reviewId: string,
) => {
  await ensureBookExists(bookId)

  const review = await ReviewModel.findOne({
    _id: reviewId,
    userId: new Types.ObjectId(userId),
    bookId: new Types.ObjectId(bookId),
  })

  if (!review) {
    throw new AppError('Review not found.', 404)
  }

  await review.deleteOne()

  const metrics = await recomputeBookReviewStats(bookId)

  return {
    metrics,
  }
}

const listPublicBookReviews = async (
  bookId: string,
  query: {
    page?: number
    limit?: number
  },
) => {
  await ensureBookExists(bookId)

  const pagination = getPaginationState(query)
  const filter = {
    bookId: new Types.ObjectId(bookId),
    isVisible: true,
  }

  const [rows, total] = await Promise.all([
    ReviewModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    ReviewModel.countDocuments(filter),
  ])

  return {
    meta: createPaginationMeta(pagination, total),
    data: rows.map((row) => formatReview(row)),
  }
}

const listReviewsForAdmin = async (query: {
  page?: number
  limit?: number
  bookId?: string
  userId?: string
  isVisible?: boolean
}) => {
  const pagination = getPaginationState(query)
  const filter: Record<string, unknown> = {}

  if (query.bookId) {
    filter.bookId = new Types.ObjectId(query.bookId)
  }

  if (query.userId) {
    filter.userId = new Types.ObjectId(query.userId)
  }

  if (typeof query.isVisible === 'boolean') {
    filter.isVisible = query.isVisible
  }

  const [rows, total] = await Promise.all([
    ReviewModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    ReviewModel.countDocuments(filter),
  ])

  return {
    meta: createPaginationMeta(pagination, total),
    data: rows.map((row) => formatReview(row)),
  }
}

const setReviewVisibility = async (reviewId: string, isVisible: boolean) => {
  const review = await ReviewModel.findById(reviewId)

  if (!review) {
    throw new AppError('Review not found.', 404)
  }

  review.isVisible = isVisible
  await review.save()

  const metrics = await recomputeBookReviewStats(review.bookId.toString())

  return {
    review: formatReview(review),
    metrics,
  }
}

export const reviewsService = {
  createReview,
  updateReview,
  deleteReview,
  listPublicBookReviews,
  listReviewsForAdmin,
  setReviewVisibility,
}
