import { AppError } from '../../common/errors/AppError'
import { auditService } from '../audit/service'
import type { IGlobalSettings, SettingsUpdatePayload } from './interface'
import { SettingsModel } from './model'

const DEFAULT_SETTINGS: Omit<
  IGlobalSettings,
  '_id' | 'createdAt' | 'updatedAt'
> = {
  singletonKey: 'global',
  providers: {
    email: {
      from: 'noreply@example.com',
      enabled: true,
    },
    push: {
      enabled: true,
    },
    storage: {
      enabled: true,
      basePath: 'uploads',
    },
    payment: {
      enabled: true,
      currency: 'BDT',
    },
  },
  templates: {
    email: {
      welcome: 'Welcome to LMS!',
      subscriptionRenewalReminder: 'Your subscription will renew soon.',
      reportReady: 'Your report is ready to download.',
    },
    push: {
      newBookAlert: 'A new book has been added to your preferred category.',
      subscriptionExpiring: 'Your subscription is expiring soon.',
    },
  },
  maintenance: {
    enabled: false,
    message: 'System is currently under maintenance.',
    startsAt: undefined,
    endsAt: undefined,
    allowedIps: [],
  },
  trial: {
    enabled: true,
    durationDays: 7,
    accessLevel: 'free',
    autoActivate: true,
  },
}

const formatSettings = (settings: IGlobalSettings) => {
  return {
    id: settings._id.toString(),
    providers: settings.providers,
    templates: settings.templates,
    maintenance: {
      ...settings.maintenance,
      startsAt: settings.maintenance.startsAt?.toISOString(),
      endsAt: settings.maintenance.endsAt?.toISOString(),
    },
    trial: settings.trial,
    createdAt: settings.createdAt.toISOString(),
    updatedAt: settings.updatedAt.toISOString(),
  }
}

const deepMerge = (
  source: Record<string, unknown>,
  partial: Record<string, unknown>,
): Record<string, unknown> => {
  const output: Record<string, unknown> = { ...source }

  for (const [key, value] of Object.entries(partial)) {
    if (value === undefined) {
      continue
    }

    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      typeof output[key] === 'object' &&
      output[key] !== null
    ) {
      output[key] = deepMerge(
        output[key] as Record<string, unknown>,
        value as Record<string, unknown>,
      )
      continue
    }

    output[key] = value
  }

  return output
}

const toPlainRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object') {
    return {}
  }

  if (
    'toObject' in value &&
    typeof (value as { toObject: unknown }).toObject === 'function'
  ) {
    return (value as { toObject: () => Record<string, unknown> }).toObject()
  }

  return value as Record<string, unknown>
}

export const settingsService = {
  getGlobalSettings: async () => {
    let settings = await SettingsModel.findOne({ singletonKey: 'global' })

    if (!settings) {
      settings = await SettingsModel.create(DEFAULT_SETTINGS)
    }

    return formatSettings(settings as IGlobalSettings)
  },

  updateGlobalSettings: async (
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
  },

  getMaintenanceState: async () => {
    const settings = await settingsService.getGlobalSettings()

    return {
      enabled: settings.maintenance.enabled,
      message: settings.maintenance.message,
      startsAt: settings.maintenance.startsAt,
      endsAt: settings.maintenance.endsAt,
      allowedIps: settings.maintenance.allowedIps,
    }
  },
}
