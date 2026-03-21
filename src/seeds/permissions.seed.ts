import { PERMISSION_SEEDS } from '../common/constants/permissions'
import { connectToDatabase, disconnectFromDatabase } from '../config/db'
import { logger } from '../config/logger'
import { PermissionModel } from '../modules/rbac/model'

/**
 * Seeds all permissions from generated PERMISSION_SEEDS.
 * Uses upsert pattern for idempotency.
 * Safe to run multiple times.
 */
export const seedPermissions = async (): Promise<void> => {
  await Promise.all(
    PERMISSION_SEEDS.map((permission) =>
      PermissionModel.updateOne(
        { key: permission.key },
        { $set: permission },
        { upsert: true },
      ),
    ),
  )
  logger.info('Permissions seeded successfully')
}

if (require.main === module) {
  void (async () => {
    try {
      await connectToDatabase()
      await seedPermissions()
      logger.info('Permissions seed completed successfully.')
      await disconnectFromDatabase()
      process.exit(0)
    } catch (error) {
      logger.error('Permissions seed failed.', {
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
