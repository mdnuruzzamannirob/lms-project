import { Types } from 'mongoose'

import {
  createPaginationMeta,
  getPaginationState,
} from '../../common/utils/pagination'
import { BookModel } from '../books/model'
import { BorrowModel } from '../borrows/model'
import { ReadingProgressModel } from '../reading/model'
import { ReservationModel } from '../reservations/model'
import { ReviewModel } from '../reviews/model'
import { SubscriptionModel } from '../subscriptions/model'
import { WishlistModel } from '../wishlist/model'
import type { IDashboardRecommendation, IDashboardStats } from './interface'

const formatBook = (book: any): object => {
  if (!book) {
    return {}
  }

  return {
    id: book._id?.toString() || book._id,
    title: book.title,
    description: book.description || null,
    authorIds: book.authorIds?.map((id: any) => id.toString()) || [],
    categoryIds: book.categoryIds?.map((id: any) => id.toString()) || [],
    reason: book.reason || null,
    coverImageUrl: book.coverImageUrl || null,
    ratingAverage: book.ratingAverage || 0,
    ratingCount: book.ratingCount || 0,
  }
}

export const dashboardService = {
  getDashboardStats: async (userId: string): Promise<IDashboardStats> => {
    const userIdObj = new Types.ObjectId(userId)
    const now = new Date()

    const [
      readingProgressData,
      borrowData,
      reservationData,
      subscriptionData,
      wishlistCount,
      reviewCount,
    ] = await Promise.all([
      ReadingProgressModel.aggregate([
        {
          $match: { userId: userIdObj },
        },
        {
          $group: {
            _id: null,
            completedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
            },
            currentCount: {
              $sum: {
                $cond: [{ $eq: ['$status', 'currently_reading'] }, 1, 0],
              },
            },
            averageRating: { $avg: '$rating' },
          },
        },
      ]),
      BorrowModel.aggregate([
        {
          $match: { userId: userIdObj },
        },
        {
          $group: {
            _id: null,
            active: {
              $sum: {
                $cond: [{ $in: ['$status', ['borrowed', 'overdue']] }, 1, 0],
              },
            },
            overdue: {
              $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] },
            },
            total: { $sum: 1 },
          },
        },
        {
          $addFields: {
            returned: { $subtract: ['$total', '$active'] },
          },
        },
      ]),
      ReservationModel.aggregate([
        {
          $match: { userId: userIdObj },
        },
        {
          $group: {
            _id: null,
            active: {
              $sum: {
                $cond: [{ $in: ['$status', ['queued', 'claimable']] }, 1, 0],
              },
            },
            claimable: {
              $sum: { $cond: [{ $eq: ['$status', 'claimable'] }, 1, 0] },
            },
          },
        },
      ]),
      SubscriptionModel.findOne({ userId: userIdObj }).sort({
        createdAt: -1,
      }),
      WishlistModel.countDocuments({ userId: userIdObj }),
      ReviewModel.countDocuments({ userId: userIdObj }),
    ])

    const reading = readingProgressData[0]
    const borrows = borrowData[0]
    const reservations = reservationData[0]

    return {
      readingStats: {
        totalBooksRead: reading?.completedCount || 0,
        booksCurrentlyReading: reading?.currentCount || 0,
        totalReadingTime: 0,
        averageRatingGiven: reading?.averageRating
          ? Number(reading.averageRating.toFixed(2))
          : 0,
      },
      borrowStats: {
        activeBorrows: borrows?.active || 0,
        overdueBorrows: borrows?.overdue || 0,
        totalBorrowsAllTime: borrows?.total || 0,
        returnedBorrows: borrows?.returned || 0,
      },
      reservationStats: {
        activeReservations: reservations?.active || 0,
        claimableReservations: reservations?.claimable || 0,
      },
      subscriptionStats: {
        currentPlan: subscriptionData?.planId?.toString() || null,
        daysRemaining: subscriptionData?.endsAt
          ? Math.max(
              0,
              Math.ceil(
                (new Date(subscriptionData.endsAt).getTime() - now.getTime()) /
                  (24 * 60 * 60 * 1000),
              ),
            )
          : 0,
        isActive: subscriptionData?.status === 'active' || false,
        renewalDate: subscriptionData?.endsAt?.toISOString() || null,
      },
      libraryStats: {
        wishlistCount,
        totalReviews: reviewCount,
      },
    }
  },

  getDashboardHome: async (userId: string, recommendationLimit: number) => {
    const stats = await dashboardService.getDashboardStats(userId)

    const recommendations = await dashboardService.getRecommendations(
      userId,
      recommendationLimit,
    )

    return {
      stats,
      recommendations: recommendations.slice(0, recommendationLimit),
    }
  },

  getRecommendations: async (
    userId: string,
    limit: number,
  ): Promise<IDashboardRecommendation[]> => {
    const userIdObj = new Types.ObjectId(userId)

    // Get categories user has interacted with
    const userCategories = await ReadingProgressModel.aggregate([
      {
        $match: { userId: userIdObj },
      },
      {
        $lookup: {
          from: 'readingprogresses',
          localField: 'bookId',
          foreignField: 'bookId',
          as: 'book',
        },
      },
      {
        $unwind: '$book',
      },
      {
        $unwind: '$book.categoryIds',
      },
      {
        $group: {
          _id: '$book.categoryIds',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 3,
      },
      {
        $project: { _id: 1 },
      },
    ])

    const categoryIds = userCategories.map((c: any) => c._id)

    if (categoryIds.length === 0) {
      const popularBooks = await BookModel.find({ isAvailable: true })
        .sort({ ratingAverage: -1, ratingCount: -1 })
        .limit(limit)
        .select(
          'title description authorIds categoryIds coverImageUrl ratingAverage ratingCount',
        )
        .lean()

      return popularBooks.map((book: any) =>
        formatBook({ ...book, reason: 'Popular' }),
      ) as IDashboardRecommendation[]
    }

    const recommendations = await BookModel.find({
      categoryIds: { $in: categoryIds },
      isAvailable: true,
    })
      .sort({ ratingAverage: -1, createdAt: -1 })
      .limit(limit)
      .select(
        'title description authorIds categoryIds coverImageUrl ratingAverage ratingCount',
      )
      .lean()

    return recommendations.map((book: any) =>
      formatBook({ ...book, reason: 'Based on your reading' }),
    ) as IDashboardRecommendation[]
  },

  getMyLibraryAggregation: async (
    userId: string,
    pagination: { page: number; limit: number },
  ) => {
    const userIdObj = new Types.ObjectId(userId)
    const paginationState = getPaginationState(pagination)
    const { skip, limit } = paginationState

    const [aggregatedItems, total] = await Promise.all([
      ReadingProgressModel.aggregate([
        {
          $match: { userId: userIdObj },
        },
        {
          $lookup: {
            from: 'books',
            localField: 'bookId',
            foreignField: '_id',
            as: 'book',
          },
        },
        {
          $unwind: '$book',
        },
        {
          $project: {
            bookId: '$book._id',
            title: '$book.title',
            description: '$book.description',
            authorIds: '$book.authorIds',
            categoryIds: '$book.categoryIds',
            coverImageUrl: '$book.coverImageUrl',
            ratingAverage: '$book.ratingAverage',
            ratingCount: '$book.ratingCount',
            readingStatus: '$status',
            lastRead: '$lastReadAt',
            progress: '$progress',
            type: { $literal: 'reading' },
          },
        },
        {
          $sort: { lastRead: -1 },
        },
        {
          $skip: skip,
        },
        {
          $limit: limit,
        },
      ]),
      ReadingProgressModel.countDocuments({ userId: userIdObj }),
    ])

    const formatted = aggregatedItems.map((item: any) => ({
      id: item.bookId.toString(),
      title: item.title,
      description: item.description || null,
      authorIds: item.authorIds?.map((id: any) => id.toString()) || [],
      categoryIds: item.categoryIds?.map((id: any) => id.toString()) || [],
      coverImageUrl: item.coverImageUrl || null,
      ratingAverage: item.ratingAverage || 0,
      ratingCount: item.ratingCount || 0,
      readingStatus: item.readingStatus,
      lastAccessed: item.lastRead?.toISOString() || null,
      progress: item.progress || 0,
      type: item.type,
    }))

    return {
      data: formatted,
      meta: createPaginationMeta(paginationState, total),
    }
  },
}
