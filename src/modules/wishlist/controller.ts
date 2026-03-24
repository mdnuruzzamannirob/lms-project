import type { RequestHandler } from 'express'

import { catchAsync } from '../../common/utils/catchAsync'
import { getBookId, getUserId } from '../../common/utils/getId'
import { sendResponse } from '../../common/utils/sendResponse'
import { wishlistService } from './service'

const getMyWishlist: RequestHandler = catchAsync(async (request, response) => {
  const result = await wishlistService.getMyWishlist(
    getUserId(request),
    request.query as { page?: number; limit?: number },
  )

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Wishlist retrieved successfully.',
    data: result.data,
    meta: result.meta,
  })
})

const addToWishlist: RequestHandler = catchAsync(async (request, response) => {
  const data = await wishlistService.addToWishlist(
    getUserId(request),
    getBookId(request),
  )

  sendResponse(response, {
    statusCode: 201,
    success: true,
    message: 'Book added to wishlist successfully.',
    data,
  })
})

const removeFromWishlist: RequestHandler = catchAsync(
  async (request, response) => {
    await wishlistService.removeFromWishlist(
      getUserId(request),
      getBookId(request),
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Book removed from wishlist successfully.',
      data: null,
    })
  },
)

export const wishlistController = {
  getMyWishlist,
  addToWishlist,
  removeFromWishlist,
}
