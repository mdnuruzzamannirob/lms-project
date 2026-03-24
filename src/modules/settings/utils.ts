import { IGlobalSettings } from './interface'

export const DEFAULT_SETTINGS: Omit<
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

export const formatSettings = (settings: IGlobalSettings) => {
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

export const deepMerge = (
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

export const toPlainRecord = (value: unknown): Record<string, unknown> => {
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
