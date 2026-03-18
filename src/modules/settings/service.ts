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
      provider: 'console',
      from: 'noreply@example.com',
      enabled: true,
    },
    sms: {
      provider: 'console',
      from: undefined,
      enabled: false,
    },
    push: {
      provider: 'console',
      enabled: true,
    },
    storage: {
      provider: 'local',
      enabled: true,
      basePath: 'uploads',
    },
    payment: {
      provider: 'sslcommerz',
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
    sms: {
      otp: 'Your OTP is {{otp}}',
      borrowExpiryReminder: 'Your borrowed book is due soon.',
    },
    push: {
      reservationReady: 'Your reserved book is now claimable.',
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
    maxBorrows: 2,
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
      settings.providers as unknown as Record<string, unknown>,
      (payload.providers ?? {}) as Record<string, unknown>,
    ) as IGlobalSettings['providers']

    settings.templates = deepMerge(
      settings.templates as unknown as Record<string, unknown>,
      (payload.templates ?? {}) as Record<string, unknown>,
    ) as IGlobalSettings['templates']

    settings.maintenance = deepMerge(
      settings.maintenance as unknown as Record<string, unknown>,
      (payload.maintenance ?? {}) as Record<string, unknown>,
    ) as IGlobalSettings['maintenance']

    settings.trial = deepMerge(
      settings.trial as unknown as Record<string, unknown>,
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
