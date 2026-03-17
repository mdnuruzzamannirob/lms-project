import mongoose from 'mongoose'
import env from './env'

export const connectDB = async (): Promise<void> => {
  await mongoose.connect(env.MONGODB_URI)
  console.log(`MongoDB connected: ${mongoose.connection.host}`)
}

mongoose.connection.on('disconnected', () =>
  console.warn('MongoDB disconnected'),
)
mongoose.connection.on('error', (err: Error) =>
  console.error('MongoDB error:', err.message),
)
