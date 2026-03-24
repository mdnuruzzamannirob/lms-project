import { catchAsync } from '../../common/utils/catchAsync'
import { getStaffId } from '../../common/utils/getId'
import { sendResponse } from '../../common/utils/sendResponse'
import { settingsService } from './service'

const getGlobalSettings = catchAsync(async (_request, response) => {
  const settings = await settingsService.getGlobalSettings()

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Global settings fetched successfully.',
    data: settings,
  })
})

const updateGlobalSettings = catchAsync(async (request, response) => {
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
})

const getMaintenanceState = catchAsync(async (_request, response) => {
  const maintenance = await settingsService.getMaintenanceState()

  sendResponse(response, {
    statusCode: 200,
    success: true,
    message: 'Maintenance state fetched successfully.',
    data: maintenance,
  })
})

export const settingsController = {
  getGlobalSettings,
  updateGlobalSettings,
  getMaintenanceState,
}
