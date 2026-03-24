import type { Types } from 'mongoose'

export interface ICategory {
  _id: Types.ObjectId
  name: string
  slug: string
  description: string | null
  parentId: Types.ObjectId | null
  sortOrder: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
