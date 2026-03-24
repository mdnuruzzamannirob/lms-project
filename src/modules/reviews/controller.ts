import type { RequestHandler } from 'express'

import { catchAsync } from '../../common/utils/catchAsync'
import { getBookId, getUserId } from '../../common/utils/getId'
import { getIdParam } from '../../common/utils/getParam'
import { sendResponse } from '../../common/utils/sendResponse'
import { reviewsService } from './service'

const createReview: RequestHandler = catchAsync(async (request, response) => {
  const data = await reviewsService.createReview(
    getUserId(request),
    getBookId(request),
    request.body,
  )

  sendResponse(response, {
    statusCode: 201,
    success: true,
    message: 'Review created successfully.',
    data,
  })
})

const updateReview: RequestHandler = catchAsync(async (request, response) => {
  const data = await reviewsService.updateReview(
    getUserId(request),
    getBookId(request),
    getIdParam(request),
    request.body,
  )

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Review updated successfully.',
    data,
  })
})

const deleteReview: RequestHandler = catchAsync(async (request, response) => {
  const data = await reviewsService.deleteReview(
    getUserId(request),
    getBookId(request),
    getIdParam(request),
  )

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Review deleted successfully.',
    data,
  })
})

const listPublicBookReviews: RequestHandler = catchAsync(
  async (request, response) => {
    const result = await reviewsService.listPublicBookReviews(
      getBookId(request),
      request.query as { page?: number; limit?: number },
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Book reviews retrieved successfully.',
      data: result.data,
      meta: result.meta,
    })
  },
)

const listReviewsForAdmin: RequestHandler = catchAsync(
  async (request, response) => {
    const result = await reviewsService.listReviewsForAdmin(
      request.query as {
        page?: number
        limit?: number
        bookId?: string
        userId?: string
        isVisible?: boolean
      },
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Reviews retrieved successfully.',
      data: result.data,
      meta: result.meta,
    })
  },
)

const toggleReviewVisibility: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await reviewsService.setReviewVisibility(
      getIdParam(request),
      request.body.isVisible,
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Review visibility updated successfully.',
      data,
    })
  },
)

export const reviewsController = {
  createReview,
  updateReview,
  deleteReview,
  listPublicBookReviews,
  listReviewsForAdmin,
  toggleReviewVisibility,
}
