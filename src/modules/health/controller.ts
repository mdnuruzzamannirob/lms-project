import type { RequestHandler } from 'express'

import { sendResponse } from '../../common/utils/sendResponse'
import {
  getHealthReport,
  getLivenessReport,
  getReadinessReport,
} from './service'

export const getHealth: RequestHandler = (request, response) => {
  const details =
    typeof request.query.details === 'boolean' ? request.query.details : false
  const data = getHealthReport({ details }, request.id)

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Service health retrieved successfully.',
    data,
  })
}

export const getLiveness: RequestHandler = (_request, response) => {
  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Service is live.',
    data: getLivenessReport(),
  })
}

export const getReadiness: RequestHandler = (_request, response) => {
  const readiness = getReadinessReport()

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
