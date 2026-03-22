import { connectToDatabase, disconnectFromDatabase } from '../config/db'
import { logger } from '../config/logger'
import { PlanModel } from '../modules/plans/model'

const defaultPlans = [
  {
    code: 'FREE',
    name: 'Free Plan',
    description: 'Access to all free books with basic reading features.',
    price: 0,
    currency: 'BDT',
    durationDays: 30,
    maxDevices: 1,
    downloadEnabled: false,
    accessLevel: 'free',
    features: ['Access to free books', 'Basic reading experience'],
    isFree: true,
    isActive: true,
    sortOrder: 1,
  },
  {
    code: 'BASIC',
    name: 'Basic Plan',
    description: 'Access to free and basic books with standard features.',
    price: 299,
    currency: 'BDT',
    durationDays: 30,
    maxDevices: 2,
    downloadEnabled: false,
    accessLevel: 'basic',
    features: [
      'Access to free & basic books',
      'Reading progress sync',
      'Priority support',
    ],
    isFree: false,
    isActive: true,
    sortOrder: 2,
  },
  {
    code: 'PREMIUM',
    name: 'Premium Plan',
    description: 'Full access to all books including premium catalog.',
    price: 599,
    currency: 'BDT',
    durationDays: 30,
    maxDevices: 5,
    downloadEnabled: true,
    accessLevel: 'premium',
    features: [
      'Access to all books',
      'Download books',
      'Multi-device sync',
      'Priority support',
    ],
    isFree: false,
    isActive: true,
    sortOrder: 3,
  },
] as const

export const seedPlans = async (): Promise<void> => {
  await Promise.all(
    defaultPlans.map((plan) =>
      PlanModel.updateOne(
        { code: plan.code },
        {
          $set: {
            ...plan,
            currency: plan.currency.toUpperCase(),
          },
        },
        { upsert: true },
      ),
    ),
  )
  logger.info(`Plans seeded — ${defaultPlans.length} plans upserted`)
}

if (require.main === module) {
  void (async () => {
    try {
      await connectToDatabase()
      await seedPlans()
      logger.info('Plan seed completed successfully.')
      await disconnectFromDatabase()
      process.exit(0)
    } catch (error) {
      logger.error('Plan seed failed.', {
        error: error instanceof Error ? error.message : String(error),
      })
      await disconnectFromDatabase()
      process.exit(1)
    }
  })()
}
