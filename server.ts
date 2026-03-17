import app from './src/app'
import { connectDB } from './src/config/db'
import env from './src/config/env'

const start = async (): Promise<void> => {
  await connectDB()
  app.listen(env.PORT, () => {
    console.log(`Server running in ${env.NODE_ENV} mode on port ${env.PORT}`)
    console.log(`Base URL: http://localhost:${env.PORT}/api/v1`)
  })
}

start().catch((err: Error) => {
  console.error('Failed to start server:', err.message)
  process.exit(1)
})
