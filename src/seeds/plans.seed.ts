import { connectToDatabase, disconnectFromDatabase } from '../config/db'
import { logger } from '../config/logger'
import { PlanModel } from '../modules/plans/model'

const defaultPlans = [
  {
    code: 'FREE',
    name: 'Free Plan',
    description: 'Basic access with limited borrows and standard reading.',
    price: 0,
    currency: 'BDT',
    durationDays: 30,
    maxBorrows: 1,
    features: ['Basic reading access', 'Standard support'],
    isFree: true,
    isActive: true,
    sortOrder: 1,
  },
  {
    code: 'PRO',
    name: 'Pro Plan',
    description: 'Extended borrowing with premium catalog access.',
    price: 499,
    currency: 'BDT',
    durationDays: 30,
    maxBorrows: 3,
    features: ['Premium catalog access', 'Priority support', 'Progress sync'],
    isFree: false,
    isActive: true,
    sortOrder: 2,
  },
  {
    code: 'PREMIUM',
    name: 'Premium Plan',
    description: 'Full access plan for unlimited premium experience.',
    price: 999,
    currency: 'BDT',
    durationDays: 30,
    maxBorrows: 10,
    features: [
      'All catalog access',
      'Highest borrow limits',
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
