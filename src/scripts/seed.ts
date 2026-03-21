import { connectToDatabase, disconnectFromDatabase } from '../config/db'
import { logger } from '../config/logger'
import { runAllSeeds } from '../seeds'

if (require.main === module) {
  void (async () => {
    try {
      await connectToDatabase()
      await runAllSeeds()
      logger.info('All seeds executed successfully.')
      await disconnectFromDatabase()
      process.exit(0)
    } catch (error) {
      logger.error('Seed execution failed.', {
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
