import { connectToDatabase, disconnectFromDatabase } from '../config/db'
import { logger } from '../config/logger'
import { SettingsModel } from '../modules/settings/model'

const defaultSettingsSeed = {
  singletonKey: 'global' as const,
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
      reportReady: 'Your report is ready for download.',
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

export const seedSettings = async (): Promise<void> => {
  await SettingsModel.updateOne(
    { singletonKey: 'global' },
    {
      $set: defaultSettingsSeed,
    },
    { upsert: true },
  )
  logger.info('Settings seeded successfully')
}

if (require.main === module) {
  void (async () => {
    try {
      await connectToDatabase()
      await seedSettings()
      logger.info('Settings seed completed successfully.')
      await disconnectFromDatabase()
      process.exit(0)
    } catch (error) {
      logger.error('Settings seed failed.', {
        error:
          error instanceof Error
            ? (error.stack ?? error.message)
            : String(error),
      })
      await disconnectFromDatabase()
      process.exit(1)
    }
  })()
}
