import type { Types } from 'mongoose'

export interface IBookFile {
  _id?: Types.ObjectId
  provider: 'cloudinary'
  publicId: string
  url: string
  format: 'pdf' | 'epub' | 'mobi' | 'txt' | 'azw3'
  size: number
  originalFileName: string
  resourceType: 'raw'
  uploadedAt: Date
}

export interface IBookCoverImage {
  provider: 'cloudinary'
  publicId: string
  url: string
  width: number
  height: number
}

export interface IBook {
  _id: Types.ObjectId
  title: string
  slug: string
  isbn: string | null
  language: 'bn' | 'en' | 'hi'
  pageCount: number | null
  publicationDate: Date | null
  edition: string | null
  summary: string
  description: string | null
  tags: string[]
  authorIds: Types.ObjectId[]
  categoryIds: Types.ObjectId[]
  publisherId: Types.ObjectId | null
  coverImage: IBookCoverImage
  files: IBookFile[]
  accessLevel: 'free' | 'basic' | 'premium'
  featured: boolean
  status: 'draft' | 'published' | 'archived'
  availabilityStatus: 'available' | 'unavailable' | 'coming_soon'
  ratingAverage: number
  ratingCount: number
  addedBy: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}
