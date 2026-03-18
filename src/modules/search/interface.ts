import type { Types } from 'mongoose'

export interface ISearchLog {
  _id: Types.ObjectId
  userId?: Types.ObjectId
  query: string
  clickedBookId?: Types.ObjectId
  timestamp: Date
  createdAt: Date
}
