import type { Types } from 'mongoose'

export interface IAuthor {
  _id: Types.ObjectId
  name: string
  bio: string | undefined
  countryCode: string | undefined
  avatar:
    | {
        publicId: string
        url: string
      }
    | undefined
  website: string | undefined
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export type AuthorListQuery = {
  search?: string
  page?: number
  limit?: number
  isActive?: boolean
}
