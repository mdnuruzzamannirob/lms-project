import type { Types } from 'mongoose'

export interface IBookFile {
  _id?: Types.ObjectId
  provider: string
  key: string
  url: string
  contentType: string
  size: number
  originalFileName: string
  uploadedAt: Date
}

export interface IBook {
  _id: Types.ObjectId
  title: string
  slug: string
  isbn: string | undefined
  summary: string
  description: string | undefined
  language: string
  pageCount: number | undefined
  publicationDate: Date | undefined
  coverImageUrl: string | undefined
  featured: boolean
  isAvailable: boolean
  authorIds: Types.ObjectId[]
  categoryIds: Types.ObjectId[]
  tags: string[]
  files: IBookFile[]
  ratingAverage: number
  ratingCount: number
  addedBy: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}
