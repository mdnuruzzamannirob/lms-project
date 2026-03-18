import { MongoMemoryReplSet } from 'mongodb-memory-server'
import mongoose from 'mongoose'

let mongoServer: MongoMemoryReplSet | null = null

export const setupTestDatabase = async () => {
  mongoServer = await MongoMemoryReplSet.create({
    replSet: {
      count: 1,
    },
    binary: {
      version: '7.0.14',
    },
  })
  const uri = mongoServer.getUri()
  await mongoose.connect(uri)
}

export const clearTestDatabase = async () => {
  const collections = mongoose.connection.collections
  const names = Object.keys(collections)

  for (const name of names) {
    const collection = collections[name]
    await collection.deleteMany({})
  }
}

export const closeTestDatabase = async () => {
  await mongoose.disconnect()

  if (mongoServer) {
    await mongoServer.stop()
    mongoServer = null
  }
}
