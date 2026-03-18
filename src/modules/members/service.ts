import { Types } from 'mongoose'

import { AppError } from '../../common/errors/AppError'
import {
  createPaginationMeta,
  getPaginationState,
} from '../../common/utils/pagination'
import { UserModel } from '../auth/auth.model'
import { PaymentModel } from '../payments/model'
import { ReadingProgressModel } from '../reading/model'
import { SubscriptionModel } from '../subscriptions/model'

const formatMember = (user: any, stats: any): object => {
  return {
    id: user._id.toString(),
    email: user.email,
    firstName: user.firstName || null,
    lastName: user.lastName || null,
    phone: user.phone || null,
    profilePicture: user.profilePicture || null,
    isSuspended: user.isSuspended || false,
    suspendedAt: user.suspendedAt?.toISOString() || null,
    suspensionReason: user.suspensionReason || null,
    joinDate: user.createdAt?.toISOString() || null,
    lastLoginAt: user.lastLoginAt?.toISOString() || null,
    totalBooksRead: stats?.booksRead || 0,
    totalAmountSpent: stats?.totalSpent || 0,
    totalOrders: stats?.orderCount || 0,
  }
}

export const membersService = {
  listMembers: async (query: {
    page: number
    limit: number
    search?: string
    isSuspended?: string
  }) => {
    const paginationState = getPaginationState(query)
    const { skip, limit } = paginationState

    const filter: Record<string, any> = {}

    if (query.search) {
      filter.$or = [
        { email: { $regex: query.search, $options: 'i' } },
        { firstName: { $regex: query.search, $options: 'i' } },
        { lastName: { $regex: query.search, $options: 'i' } },
      ]
    }

    if (query.isSuspended === 'true') {
      filter.isSuspended = true
    } else if (query.isSuspended === 'false') {
      filter.isSuspended = false
    }

    const [users, total] = await Promise.all([
      UserModel.find(filter)
        .select(
          'email firstName lastName phone profilePicture isSuspended suspendedAt suspensionReason createdAt lastLoginAt',
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      UserModel.countDocuments(filter),
    ])

    const formatted = await Promise.all(
      users.map(async (user: any) => {
        const stats = await membersService.getUserStats(user._id.toString())
        return formatMember(user, stats)
      }),
    )

    return {
      data: formatted,
      meta: createPaginationMeta(paginationState, total),
    }
  },

  getMemberDetail: async (userId: string) => {
    const user = await UserModel.findById(userId).lean()

    if (!user) {
      throw new AppError('Member not found.', 404)
    }

    const userIdObj = new Types.ObjectId(userId)
    const stats = await membersService.getUserStats(userId)

    const [readingHistory, paymentHistory, activeSubscription] =
      await Promise.all([
        ReadingProgressModel.find({ userId: userIdObj })
          .select('bookId status createdAt updatedAt')
          .sort({ createdAt: -1 })
          .limit(50)
          .lean(),
        PaymentModel.find({ userId: userIdObj })
          .select('amount status transactionId createdAt')
          .sort({ createdAt: -1 })
          .limit(50)
          .lean(),
        SubscriptionModel.findOne({ userId: userIdObj })
          .select('planId startedAt endsAt status')
          .sort({ createdAt: -1 })
          .lean(),
      ])

    const memberDetail = {
      ...formatMember(user, stats),
      readingHistory: readingHistory.map((r: any) => ({
        bookId: r.bookId.toString(),
        title: `Book ${r.bookId.toString().slice(0, 8)}`,
        status: r.status,
        startedAt: r.createdAt?.toISOString() || null,
        completedAt: r.updatedAt?.toISOString() || null,
      })),
      paymentHistory: paymentHistory.map((p: any) => ({
        id: p._id.toString(),
        amount: p.amount,
        status: p.status,
        transactionId: p.transactionId || null,
        createdAt: p.createdAt?.toISOString() || null,
      })),
      activeSubscription: activeSubscription
        ? {
            planId: activeSubscription.planId.toString(),
            startedAt: activeSubscription.startedAt?.toISOString() || null,
            endsAt: activeSubscription.endsAt?.toISOString() || null,
            status: activeSubscription.status || 'active',
          }
        : null,
    }

    return memberDetail
  },

  suspendMember: async (userId: string, reason: string) => {
    const user = await UserModel.findByIdAndUpdate(
      userId,
      {
        isSuspended: true,
        suspendedAt: new Date(),
        suspensionReason: reason,
      },
      { new: true },
    ).lean()

    if (!user) {
      throw new AppError('Member not found.', 404)
    }

    const stats = await membersService.getUserStats(userId)
    return formatMember(user, stats)
  },

  unsuspendMember: async (userId: string) => {
    const user = await UserModel.findByIdAndUpdate(
      userId,
      {
        isSuspended: false,
        suspendedAt: undefined,
        suspensionReason: undefined,
      },
      { new: true },
    ).lean()

    if (!user) {
      throw new AppError('Member not found.', 404)
    }

    const stats = await membersService.getUserStats(userId)
    return formatMember(user, stats)
  },

  getMemberReadingHistory: async (
    userId: string,
    query: {
      status: 'current' | 'completed' | 'all'
      page: number
      limit: number
    },
  ) => {
    const paginationState = getPaginationState(query)
    const { skip, limit } = paginationState
    const userIdObj = new Types.ObjectId(userId)

    const filter: Record<string, any> = { userId: userIdObj }

    if (query.status === 'current') {
      filter.status = 'currently_reading'
    } else if (query.status === 'completed') {
      filter.status = 'completed'
    }

    const [readings, total] = await Promise.all([
      ReadingProgressModel.find(filter)
        .select('bookId status createdAt updatedAt rating')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ReadingProgressModel.countDocuments(filter),
    ])

    const formatted = readings.map((r: any) => ({
      bookId: r.bookId.toString(),
      status: r.status,
      startedAt: r.createdAt?.toISOString() || null,
      completedAt: r.updatedAt?.toISOString() || null,
      userRating: r.rating || null,
    }))

    return {
      data: formatted,
      meta: createPaginationMeta(paginationState, total),
    }
  },

  getMemberPaymentHistory: async (
    userId: string,
    query: {
      page: number
      limit: number
    },
  ) => {
    const paginationState = getPaginationState(query)
    const { skip, limit } = paginationState
    const userIdObj = new Types.ObjectId(userId)

    const [payments, total] = await Promise.all([
      PaymentModel.find({ userId: userIdObj })
        .select('amount status transactionId currency createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PaymentModel.countDocuments({ userId: userIdObj }),
    ])

    const formatted = payments.map((p: any) => ({
      id: p._id.toString(),
      amount: p.amount,
      status: p.status,
      transactionId: p.transactionId || null,
      currency: p.currency || 'BDT',
      createdAt: p.createdAt?.toISOString() || null,
    }))

    return {
      data: formatted,
      meta: createPaginationMeta(paginationState, total),
    }
  },

  getUserStats: async (userId: string) => {
    const userIdObj = new Types.ObjectId(userId)

    const [readingStats, paymentStats] = await Promise.all([
      ReadingProgressModel.aggregate([
        { $match: { userId: userIdObj } },
        {
          $group: {
            _id: null,
            completed: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
            },
          },
        },
      ]),
      PaymentModel.aggregate([
        { $match: { userId: userIdObj, status: 'success' } },
        {
          $group: {
            _id: null,
            totalSpent: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
    ])

    const booksRead = readingStats[0]?.completed || 0
    const spent = paymentStats[0]?.totalSpent || 0
    const orderCount = paymentStats[0]?.count || 0

    return {
      booksRead,
      totalSpent: spent,
      orderCount,
    }
  },
}
