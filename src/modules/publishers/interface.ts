import type { Types } from 'mongoose'

export interface IPublisher {
  _id: Types.ObjectId
  name: string
  slug: string
  description: string | undefined
  website: string | undefined
  logo:
    | {
        publicId: string
        url: string
      }
    | undefined
  country: string | undefined
  foundedYear: number | undefined
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
