import { Types } from 'mongoose'

import {
  createPaginationMeta,
  getPaginationState,
} from '../../common/utils/pagination'
import { BookModel } from '../books/model'
import { SearchLogModel } from './model'
import { formatBook } from './utils'

const searchBooks = async (
  query: string,
  pagination: {
    page: number
    limit: number
  },
) => {
  const paginationState = getPaginationState(pagination)
  const { skip, limit } = paginationState

  const searchQuery = {
    $or: [
      { title: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
    ],
    isAvailable: true,
  }

  const [books, total] = await Promise.all([
    BookModel.find(searchQuery)
      .select(
        'title description authorIds categoryIds isbn publishedYear ratingAverage ratingCount pageCount language coverImage',
      )
      .skip(skip)
      .limit(limit)
      .lean(),
    BookModel.countDocuments(searchQuery),
  ])

  const formatted = books.map((b) => formatBook(b))

  return {
    data: formatted,
    meta: createPaginationMeta(paginationState, total),
  }
}

const getSearchSuggestions = async (query: string, limit: number) => {
  const suggestions = await SearchLogModel.aggregate([
    {
      $match: {
        query: { $regex: `^${query}`, $options: 'i' },
      },
    },
    {
      $group: {
        _id: '$query',
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 },
    },
    {
      $limit: limit,
    },
    {
      $project: {
        _id: 0,
        text: '$_id',
        frequency: '$count',
      },
    },
  ])

  return suggestions
}

const getPopularSearchTerms = async (
  period: 'day' | 'week' | 'month' | 'all',
  limit: number,
) => {
  const now = new Date()
  let startDate = new Date(0)

  if (period === 'day') {
    startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  } else if (period === 'week') {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  } else if (period === 'month') {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  }

  const terms = await SearchLogModel.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: '$query',
        count: { $sum: 1 },
        lastSearched: { $max: '$timestamp' },
      },
    },
    {
      $sort: { count: -1, lastSearched: -1 },
    },
    {
      $limit: limit,
    },
    {
      $project: {
        _id: 0,
        term: '$_id',
        searchCount: '$count',
        lastSearched: '$lastSearched',
      },
    },
  ])

  return terms
}

const logSearchClick = async (
  userId: string | undefined,
  query: string,
  bookId?: string,
) => {
  const log = await SearchLogModel.create({
    userId: userId ? new Types.ObjectId(userId) : undefined,
    query: query.toLowerCase(),
    clickedBookId: bookId ? new Types.ObjectId(bookId) : undefined,
    timestamp: new Date(),
  })

  return {
    id: log._id.toString(),
    recorded: true,
  }
}

const getSearchHistory = async (userId: string, limit: number) => {
  const history = await SearchLogModel.find({
    userId: new Types.ObjectId(userId),
    clickedBookId: null,
  })
    .select('query timestamp')
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean()

  return history.map((h: any) => ({
    query: h.query,
    timestamp: h.timestamp?.toISOString() || null,
  }))
}

export const searchService = {
  searchBooks,
  getSearchSuggestions,
  getPopularSearchTerms,
  logSearchClick,
  getSearchHistory,
}
