import type { Request, Response } from 'express'

import { catchAsync } from '../../common/utils/catchAsync'
import { sendResponse } from '../../common/utils/sendResponse'
import { dashboardService } from './service'

export const dashboardController = {
  getDashboardHome: catchAsync(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10

    const result = await dashboardService.getDashboardHome(userId, limit)

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Dashboard home retrieved successfully.',
      data: result,
    })
  }),

  getDashboardStats: catchAsync(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id

    const stats = await dashboardService.getDashboardStats(userId)

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Dashboard stats retrieved successfully.',
      data: stats,
    })
  }),

  getRecommendations: catchAsync(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10

    const recommendations = await dashboardService.getRecommendations(userId, limit)

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Recommendations retrieved successfully.',
      data: recommendations,
    })
  }),

  getMyLibrary: catchAsync(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10

    const result = await dashboardService.getMyLibraryAggregation(userId, {
      page,
      limit,
    })

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'My library retrieved successfully.',
      data: result.data,
      meta: result.meta,
    })
  }),
}
