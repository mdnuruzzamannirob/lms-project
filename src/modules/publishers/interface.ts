import type { Types } from 'mongoose'

export interface IPublisherLogo {
  provider: 'cloudinary'
  publicId: string
  url: string
}

export interface IPublisher {
  _id: Types.ObjectId
  name: string
  slug: string
  description: string | null
  website: string | null
  logo: IPublisherLogo | null
  countryCode: string | null
  foundedYear: number | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
