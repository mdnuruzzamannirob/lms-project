import type { RequestHandler } from 'express'

import { catchAsync } from '../../common/utils/catchAsync'
import { getIdParam } from '../../common/utils/getParam'
import { sendResponse } from '../../common/utils/sendResponse'
import { plansService } from './service'

const listPlans: RequestHandler = catchAsync(async (request, response) => {
  const includeInactive =
    typeof request.query.includeInactive === 'boolean'
      ? request.query.includeInactive
      : false

  const data = await plansService.listPlans(includeInactive)

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Plans retrieved successfully.',
    data,
  })
})

const getPlanById: RequestHandler = catchAsync(async (request, response) => {
  const data = await plansService.getPlanById(getIdParam(request))

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Plan retrieved successfully.',
    data,
  })
})

const createPlan: RequestHandler = catchAsync(async (request, response) => {
  const data = await plansService.createPlan(request.body)

  sendResponse(response, {
    statusCode: 201,
    success: true,
    message: 'Plan created successfully.',
    data,
  })
})

const updatePlan: RequestHandler = catchAsync(async (request, response) => {
  const data = await plansService.updatePlan(getIdParam(request), request.body)

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Plan updated successfully.',
    data,
  })
})

const togglePlan: RequestHandler = catchAsync(async (request, response) => {
  const data = await plansService.togglePlan(getIdParam(request))

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Plan status updated successfully.',
    data,
  })
})

export const plansController = {
  listPlans,
  getPlanById,
  createPlan,
  updatePlan,
  togglePlan,
}
