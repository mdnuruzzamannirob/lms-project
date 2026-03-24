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

export type BookStatus = IBook['status']
export type BookAvailabilityStatus = IBook['availabilityStatus']
export type BookLanguage = IBook['language']
export type BookAccessLevel = IBook['accessLevel']
export type BookFileFormat = IBookFile['format']

export interface BooksListQuery {
  page?: number
  limit?: number
  search?: string
  featured?: boolean
  status?: BookStatus
  availabilityStatus?: BookAvailabilityStatus
  authorId?: string
  categoryId?: string
  publisherId?: string
  accessLevel?: BookAccessLevel
  language?: BookLanguage
}

export interface CreateBookPayload {
  title: string
  slug: string
  isbn?: string | null
  summary: string
  description?: string | null
  language: BookLanguage
  pageCount?: number | null
  publicationDate?: Date | null
  coverImage: IBookCoverImage
  publisherId?: string | null
  accessLevel: BookAccessLevel
  status: BookStatus
  edition?: string | null
  featured: boolean
  availabilityStatus: BookAvailabilityStatus
  authorIds: string[]
  categoryIds: string[]
  tags: string[]
}

export type UpdateBookPayload = Partial<CreateBookPayload>

export interface BulkImportBooksPayload {
  books: CreateBookPayload[]
}

export interface AddBookFilePayload {
  fileName: string
  contentType: string
  fileBase64?: string
  folder?: string
  publicId?: string
  url?: string
  format?: BookFileFormat
  resourceType?: 'raw'
  size?: number
}

export interface ToggleBookFeaturedPayload {
  featured: boolean
}

export interface SetBookStatusPayload {
  status: BookStatus
}

export interface SetBookAvailabilityPayload {
  availabilityStatus: BookAvailabilityStatus
}
