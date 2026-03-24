import type { Types } from 'mongoose'

export interface IAuthorAvatar {
  provider: 'cloudinary'
  publicId: string
  url: string
}

export interface IAuthor {
  _id: Types.ObjectId
  name: string
  slug: string
  bio: string | null
  countryCode: string | null
  avatar: IAuthorAvatar | null
  website: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
