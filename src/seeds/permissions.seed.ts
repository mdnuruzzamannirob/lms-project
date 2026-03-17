import { connectToDatabase, disconnectFromDatabase } from '../config/db'
import { logger } from '../config/logger'
import { rbacService } from '../modules/rbac'

export const seedPermissions = async (): Promise<void> => {
  await rbacService.ensurePermissionSeed()
}

if (require.main === module) {
  void (async () => {
    try {
      await connectToDatabase()
      await seedPermissions()
      logger.info('Permission seed completed successfully.')
      await disconnectFromDatabase()
      process.exit(0)
    } catch (error) {
      logger.error('Permission seed failed.', {
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
