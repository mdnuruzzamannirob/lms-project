import { Types } from 'mongoose'

import { UserModel } from '../auth/model'
import { BookModel } from '../books/model'
import { BorrowModel } from '../borrows/model'
import { PaymentModel } from '../payments/model'
import { SubscriptionModel } from '../subscriptions/model'
import type { AdminOverviewAggregation, ReportType } from './interface'

const getPeriodStart = (days: number): Date => {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

export const reportsAggregationService = {
  getAdminOverview: async (): Promise<AdminOverviewAggregation> => {
    const [
      users,
      activeSubscriptions,
      revenueAgg,
      popularBooksAgg,
      borrowStatsAgg,
    ] = await Promise.all([
      UserModel.countDocuments({}),
      SubscriptionModel.countDocuments({
        status: 'active',
        endsAt: { $gte: new Date() },
      }),
      PaymentModel.aggregate([
        { $match: { status: 'success' } },
        { $group: { _id: null, total: { $sum: '$payableAmount' } } },
      ]),
      BorrowModel.aggregate([
        { $group: { _id: '$bookId', borrowCount: { $sum: 1 } } },
        { $sort: { borrowCount: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'books',
            localField: '_id',
            foreignField: '_id',
            as: 'book',
          },
        },
        { $unwind: { path: '$book', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            bookId: '$_id',
            title: '$book.title',
            borrowCount: 1,
          },
        },
      ]),
      BorrowModel.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
    ])

    const borrowStats = {
      total: 0,
      borrowed: 0,
      returned: 0,
      overdue: 0,
      cancelled: 0,
    }

    for (const item of borrowStatsAgg) {
      const status = item._id as keyof typeof borrowStats
      if (status in borrowStats) {
        borrowStats[status] = Number(item.count ?? 0)
        borrowStats.total += Number(item.count ?? 0)
      }
    }

    return {
      totals: {
        users,
        activeSubscriptions,
        revenue: Number(revenueAgg[0]?.total ?? 0),
      },
      popularBooks: popularBooksAgg.map((item) => ({
        bookId: (item.bookId as Types.ObjectId).toString(),
        title: String(item.title ?? 'Unknown Book'),
        borrowCount: Number(item.borrowCount ?? 0),
      })),
      borrowStats,
    }
  },

  getRevenueSummary: async (filters: Record<string, unknown>) => {
    const from = filters['from']
      ? new Date(String(filters['from']))
      : getPeriodStart(30)
    const to = filters['to'] ? new Date(String(filters['to'])) : new Date()

    const rows = await PaymentModel.aggregate([
      {
        $match: {
          status: 'success',
          createdAt: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
          },
          revenue: { $sum: '$payableAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ])

    return rows.map((row) => ({
      date: `${row._id.year}-${String(row._id.month).padStart(2, '0')}-${String(row._id.day).padStart(2, '0')}`,
      revenue: Number(row.revenue ?? 0),
      paymentCount: Number(row.count ?? 0),
    }))
  },

  getPopularBooks: async (filters: Record<string, unknown>) => {
    const limit = Number(filters['limit'] ?? 20)

    const rows = await BorrowModel.aggregate([
      { $group: { _id: '$bookId', borrowCount: { $sum: 1 } } },
      { $sort: { borrowCount: -1 } },
      { $limit: Math.max(1, Math.min(100, limit)) },
      {
        $lookup: {
          from: 'books',
          localField: '_id',
          foreignField: '_id',
          as: 'book',
        },
      },
      { $unwind: { path: '$book', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          bookId: '$_id',
          title: '$book.title',
          borrowCount: 1,
          ratingAverage: '$book.ratingAverage',
          ratingCount: '$book.ratingCount',
        },
      },
    ])

    return rows.map((row) => ({
      bookId: (row.bookId as Types.ObjectId).toString(),
      title: String(row.title ?? 'Unknown Book'),
      borrowCount: Number(row.borrowCount ?? 0),
      ratingAverage: Number(row.ratingAverage ?? 0),
      ratingCount: Number(row.ratingCount ?? 0),
    }))
  },

  getBorrowStats: async (filters: Record<string, unknown>) => {
    const from = filters['from']
      ? new Date(String(filters['from']))
      : getPeriodStart(30)
    const to = filters['to'] ? new Date(String(filters['to'])) : new Date()

    const rows = await BorrowModel.aggregate([
      {
        $match: {
          createdAt: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ])

    const result = {
      from: from.toISOString(),
      to: to.toISOString(),
      total: 0,
      borrowed: 0,
      returned: 0,
      overdue: 0,
      cancelled: 0,
    }

    for (const row of rows) {
      const status = String(row._id)
      const count = Number(row.count ?? 0)
      if (
        status === 'borrowed' ||
        status === 'returned' ||
        status === 'overdue' ||
        status === 'cancelled'
      ) {
        result[status] = count
        result.total += count
      }
    }

    return result
  },

  buildReportData: async (
    type: ReportType,
    filters: Record<string, unknown>,
  ) => {
    if (type === 'admin_overview') {
      return reportsAggregationService.getAdminOverview()
    }

    if (type === 'revenue_summary') {
      return reportsAggregationService.getRevenueSummary(filters)
    }

    if (type === 'popular_books') {
      return reportsAggregationService.getPopularBooks(filters)
    }

    return reportsAggregationService.getBorrowStats(filters)
  },

  getBooksCount: async () => {
    return BookModel.countDocuments({})
  },
}
