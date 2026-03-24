import type { RequestHandler } from 'express'

import { catchAsync } from '../../common/utils/catchAsync'
import { getIdParam } from '../../common/utils/getParam'
import { sendResponse } from '../../common/utils/sendResponse'
import { promotionsService } from './service'

const validateCoupon: RequestHandler = catchAsync(async (request, response) => {
  const data = await promotionsService.validateCoupon(request.body)

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Coupon validated successfully.',
    data,
  })
})

const listCoupons: RequestHandler = catchAsync(async (_request, response) => {
  const data = await promotionsService.listCoupons()

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Coupons retrieved successfully.',
    data,
  })
})

const getCouponById: RequestHandler = catchAsync(async (request, response) => {
  const data = await promotionsService.getCouponById(getIdParam(request))

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Coupon retrieved successfully.',
    data,
  })
})

const createCoupon: RequestHandler = catchAsync(async (request, response) => {
  const data = await promotionsService.createCoupon(request.body)

  sendResponse(response, {
    statusCode: 201,
    success: true,
    message: 'Coupon created successfully.',
    data,
  })
})

const updateCoupon: RequestHandler = catchAsync(async (request, response) => {
  const data = await promotionsService.updateCoupon(
    getIdParam(request),
    request.body,
  )

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Coupon updated successfully.',
    data,
  })
})

const toggleCoupon: RequestHandler = catchAsync(async (request, response) => {
  const data = await promotionsService.toggleCoupon(getIdParam(request))

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Coupon status updated successfully.',
    data,
  })
})

const deleteCoupon: RequestHandler = catchAsync(async (request, response) => {
  await promotionsService.deleteCoupon(getIdParam(request))

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Coupon deleted successfully.',
    data: null,
  })
})

const getActiveFlashSales: RequestHandler = catchAsync(
  async (_request, response) => {
    const data = await promotionsService.getActiveFlashSales()

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Active flash sales retrieved successfully.',
      data,
    })
  },
)

const listFlashSales: RequestHandler = catchAsync(
  async (_request, response) => {
    const data = await promotionsService.listFlashSales()

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Flash sales retrieved successfully.',
      data,
    })
  },
)

const createFlashSale: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await promotionsService.createFlashSale(request.body)

    sendResponse(response, {
      statusCode: 201,
      success: true,
      message: 'Flash sale created successfully.',
      data,
    })
  },
)

const updateFlashSale: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await promotionsService.updateFlashSale(
      getIdParam(request),
      request.body,
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Flash sale updated successfully.',
      data,
    })
  },
)

const toggleFlashSale: RequestHandler = catchAsync(
  async (request, response) => {
    const data = await promotionsService.toggleFlashSale(getIdParam(request))

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Flash sale status updated successfully.',
      data,
    })
  },
)

const deleteFlashSale: RequestHandler = catchAsync(
  async (request, response) => {
    await promotionsService.deleteFlashSale(getIdParam(request))

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Flash sale deleted successfully.',
      data: null,
    })
  },
)

export const promotionsController = {
  validateCoupon,
  listCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  toggleCoupon,
  deleteCoupon,
  getActiveFlashSales,
  listFlashSales,
  createFlashSale,
  updateFlashSale,
  toggleFlashSale,
  deleteFlashSale,
}
