import type { Types } from 'mongoose'

export interface IBookFile {
  _id?: Types.ObjectId
  provider: 'cloudinary'
  publicId: string
  url: string
  format: 'pdf' | 'epub' | 'mobi'
  size: number
  originalFileName: string
  resourceType: 'raw'
  uploadedAt: Date
}

export interface IBookCoverImage {
  publicId: string
  url: string
  width: number
  height: number
}

export interface IBook {
  _id: Types.ObjectId
  title: string
  slug: string
  isbn: string | undefined
  language: string
  pageCount: number | undefined
  publicationDate: Date | undefined
  edition: string | undefined
  summary: string
  description: string | undefined
  tags: string[]
  authorIds: Types.ObjectId[]
  categoryIds: Types.ObjectId[]
  publisherId: Types.ObjectId | undefined
  coverImage: IBookCoverImage | undefined
  files: IBookFile[]
  accessLevel: 'free' | 'basic' | 'premium'
  featured: boolean
  isAvailable: boolean
  isPublished: boolean
  ratingAverage: number
  ratingCount: number
  addedBy: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}
