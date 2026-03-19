import type { RequestHandler } from 'express'

import { sendResponse } from '../../common/utils/sendResponse'
import { healthService } from './service'

const getHealth: RequestHandler = (request, response) => {
  const details =
    typeof request.query.details === 'boolean' ? request.query.details : false
  const data = healthService.getHealthReport({ details }, request.id)

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Service health retrieved successfully.',
    data,
  })
}

const getLiveness: RequestHandler = (_request, response) => {
  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Service is live.',
    data: healthService.getLivenessReport(),
  })
}

const getReadiness: RequestHandler = (_request, response) => {
  const readiness = healthService.getReadinessReport()

  sendResponse(response, {
    statusCode: readiness.statusCode,
    success: readiness.statusCode === 200,
    message:
      readiness.statusCode === 200
        ? 'Service is ready.'
        : 'Service is not ready.',
    data: readiness.body,
  })
}

export const healthController = {
  getHealth,
  getLiveness,
  getReadiness,
}
