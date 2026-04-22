import { connectToDatabase, disconnectFromDatabase } from '../config/db'
import { logger } from '../config/logger'
import { PlanModel } from '../modules/plans/model'
import { syncPlanCatalogWithStripe } from './stripe-plan-sync'

const defaultPlans = [
  {
    code: 'FREE',
    name: 'Free Plan',
    description: 'Access to free books with core reading tools.',
    price: 0,
    currency: 'BDT',
    durationDays: 30,
    maxDevices: 1,
    downloadEnabled: false,
    accessLevel: 'free',
    features: ['Access free books only', 'Web reader access'],
    isFree: true,
    recommended: false,
    isActive: true,
    sortOrder: 1,
  },
  {
    code: 'BASIC',
    name: 'Basic Plan',
    description: 'Access free and pro books with everyday reading features.',
    price: 299,
    currency: 'BDT',
    durationDays: 30,
    maxDevices: 2,
    downloadEnabled: false,
    accessLevel: 'basic',
    features: [
      'Access free + pro books',
      'Web reader access',
      'Reading progress sync',
      'Highlights & annotations',
      'Multi-device access (up to 3)',
      'AI tools (limited access)',
      'Audiobook access',
    ],
    isFree: false,
    recommended: false,
    isActive: true,
    sortOrder: 2,
  },
  {
    code: 'PREMIUM',
    name: 'Premium Plan',
    description: 'Full access to every book and premium reading tools.',
    price: 599,
    currency: 'BDT',
    durationDays: 30,
    maxDevices: 5,
    downloadEnabled: true,
    accessLevel: 'premium',
    features: [
      'Access all books (free + pro + premium)',
      'Web reader access',
      'Reading progress sync',
      'Highlights & annotations',
      'Multi-device access (up to 5)',
      'AI tools (full access)',
      'Audiobook access',
    ],
    isFree: false,
    recommended: true,
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

  await syncPlanCatalogWithStripe(
    defaultPlans.map((plan) => ({
      code: plan.code,
      name: plan.name,
      description: plan.description,
      price: plan.price,
      currency: plan.currency,
    })),
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
