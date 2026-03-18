import { type Request, type RequestHandler } from 'express'

import { AppError } from '../../common/errors/AppError'
import { catchAsync } from '../../common/utils/catchAsync'
import { sendResponse } from '../../common/utils/sendResponse'
import { settingsService } from './service'

const getStaffId = (request: Request): string => {
  if (!request.auth || request.auth.type !== 'staff') {
    throw new AppError('Staff authentication is required.', 401)
  }

  return request.auth.sub
}

export const settingsController: Record<string, RequestHandler> = {
  getGlobalSettings: catchAsync(async (_request, response) => {
    const settings = await settingsService.getGlobalSettings()

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Global settings fetched successfully.',
      data: settings,
    })
  }),

  updateGlobalSettings: catchAsync(async (request, response) => {
    const staffId = getStaffId(request)
    const updated = await settingsService.updateGlobalSettings(
      staffId,
      request.body,
    )

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Global settings updated successfully.',
      data: updated,
    })
  }),

  getMaintenanceState: catchAsync(async (_request, response) => {
    const maintenance = await settingsService.getMaintenanceState()

    sendResponse(response, {
      statusCode: 200,
      success: true,
      message: 'Maintenance state fetched successfully.',
      data: maintenance,
    })
  }),
}
