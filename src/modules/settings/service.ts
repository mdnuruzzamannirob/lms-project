import { AppError } from '../../common/errors/AppError'
import { auditService } from '../audit/service'
import type { IGlobalSettings, SettingsUpdatePayload } from './interface'
import { SettingsModel } from './model'
import {
  deepMerge,
  DEFAULT_SETTINGS,
  formatSettings,
  toPlainRecord,
} from './utils'

const getGlobalSettings = async () => {
  let settings = await SettingsModel.findOne({ singletonKey: 'global' })

  if (!settings) {
    settings = await SettingsModel.create(DEFAULT_SETTINGS)
  }

  return formatSettings(settings as IGlobalSettings)
}

const updateGlobalSettings = async (
  actorStaffId: string,
  payload: SettingsUpdatePayload,
) => {
  let settings = await SettingsModel.findOne({ singletonKey: 'global' })

  if (!settings) {
    settings = await SettingsModel.create(DEFAULT_SETTINGS)
  }

  if (
    payload.maintenance?.startsAt &&
    payload.maintenance?.endsAt &&
    payload.maintenance.endsAt.getTime() <=
      payload.maintenance.startsAt.getTime()
  ) {
    throw new AppError('Maintenance end time must be after start time.', 400)
  }

  settings.providers = deepMerge(
    toPlainRecord(settings.providers),
    (payload.providers ?? {}) as Record<string, unknown>,
  ) as IGlobalSettings['providers']

  settings.templates = deepMerge(
    toPlainRecord(settings.templates),
    (payload.templates ?? {}) as Record<string, unknown>,
  ) as IGlobalSettings['templates']

  settings.maintenance = deepMerge(
    toPlainRecord(settings.maintenance),
    (payload.maintenance ?? {}) as Record<string, unknown>,
  ) as IGlobalSettings['maintenance']

  settings.trial = deepMerge(
    toPlainRecord(settings.trial),
    (payload.trial ?? {}) as Record<string, unknown>,
  ) as IGlobalSettings['trial']

  await settings.save()

  await auditService.createLog({
    actorType: 'admin',
    actorId: actorStaffId,
    action: 'settings.update',
    module: 'settings',
    description: 'Global settings updated.',
    targetType: 'settings',
    meta: {
      updatedSections: Object.keys(payload),
    },
  })

  return formatSettings(settings as IGlobalSettings)
}

const getMaintenanceState = async () => {
  const settings = await settingsService.getGlobalSettings()

  return {
    enabled: settings.maintenance.enabled,
    message: settings.maintenance.message,
    startsAt: settings.maintenance.startsAt,
    endsAt: settings.maintenance.endsAt,
    allowedIps: settings.maintenance.allowedIps,
  }
}

export const settingsService = {
  getGlobalSettings,
  updateGlobalSettings,
  getMaintenanceState,
}
