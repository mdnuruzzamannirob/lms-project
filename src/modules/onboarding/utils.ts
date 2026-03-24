import type { RequestHandler } from 'express'

import { AppError } from '../../common/errors/AppError'
import { planCatalog } from './constants'

export const getAuthenticatedUserId = (
  request: Parameters<RequestHandler>[0],
): string => {
  if (!request.auth || request.auth.type !== 'user') {
    throw new AppError('User authentication is required.', 401)
  }

  return request.auth.sub
}
export const findPlanByCode = (planCode: string) => {
  return planCatalog.find((plan) => plan.code === planCode)
}
