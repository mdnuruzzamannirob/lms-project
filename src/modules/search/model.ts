import { Schema, model } from 'mongoose'

import type { ISearchLog } from './interface'

const searchLogSchema = new Schema<ISearchLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    query: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    clickedBookId: {
      type: Schema.Types.ObjectId,
      ref: 'Book',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  },
)

searchLogSchema.index({ userId: 1, timestamp: -1 })
searchLogSchema.index({ query: 1, timestamp: -1 })

export const SearchLogModel = model<ISearchLog>('SearchLog', searchLogSchema)
