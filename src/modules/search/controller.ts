import type { Request, Response } from 'express'

import { catchAsync } from '../../common/utils/catchAsync'
import { sendResponse } from '../../common/utils/sendResponse'
import { searchService } from './service'

export const searchController = {
  searchBooks: catchAsync(async (req: Request, res: Response) => {
    const { q, page, limit } = req.query as any

    const result = await searchService.searchBooks(q, {
      page: page || 1,
      limit: limit || 10,
    })

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Search results retrieved successfully.',
      data: result.data,
      meta: result.meta,
    })
  }),

  getSearchSuggestions: catchAsync(async (req: Request, res: Response) => {
    const { q, limit } = req.query as any

    const suggestions = await searchService.getSearchSuggestions(q, limit || 5)

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Search suggestions retrieved successfully.',
      data: suggestions,
    })
  }),

  getPopularSearchTerms: catchAsync(async (req: Request, res: Response) => {
    const { period, limit } = req.query as any

    const terms = await searchService.getPopularSearchTerms(
      period || 'week',
      limit || 10,
    )

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Popular search terms retrieved successfully.',
      data: terms,
    })
  }),

  logSearchClick: catchAsync(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id
    const { query, bookId } = req.body

    const result = await searchService.logSearchClick(userId, query, bookId)

    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: 'Search click logged successfully.',
      data: result,
    })
  }),

  getSearchHistory: catchAsync(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10

    const history = await searchService.getSearchHistory(userId, limit)

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Search history retrieved successfully.',
      data: history,
    })
  }),
}
