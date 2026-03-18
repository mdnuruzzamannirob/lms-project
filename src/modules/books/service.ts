import { Buffer } from 'node:buffer'

import { Types } from 'mongoose'

import { AppError } from '../../common/errors/AppError'
import { storageService } from '../../common/services/storage.service'
import {
  createPaginationMeta,
  getPaginationState,
} from '../../common/utils/pagination'
import { AuthorModel } from '../authors/model'
import { CategoryModel } from '../categories/model'
import type { IBook } from './interface'
import { BookModel } from './model'

type BookQuery = {
  page?: number
  limit?: number
  search?: string
  featured?: boolean
  isAvailable?: boolean
  authorId?: string
  categoryId?: string
}

const toObjectIdArray = (values: string[]) => {
  const uniqueValues = [...new Set(values)]
  return uniqueValues.map((value) => new Types.ObjectId(value))
}

const parseBase64 = (value: string): Buffer => {
  const normalized = value.includes(',')
    ? (value.split(',').pop() ?? '')
    : value
  const buffer = Buffer.from(normalized, 'base64')

  if (buffer.byteLength === 0) {
    throw new AppError('Invalid base64 file payload.', 400)
  }

  return buffer
}

const formatBook = (book: IBook | null) => {
  if (!book) {
    throw new AppError('Book not found.', 404)
  }

  return {
    id: book._id.toString(),
    title: book.title,
    slug: book.slug,
    isbn: book.isbn,
    summary: book.summary,
    description: book.description,
    language: book.language,
    pageCount: book.pageCount,
    publicationDate: book.publicationDate?.toISOString(),
    coverImageUrl: book.coverImageUrl,
    featured: book.featured,
    isAvailable: book.isAvailable,
    authorIds: book.authorIds.map((authorId) => authorId.toString()),
    categoryIds: book.categoryIds.map((categoryId) => categoryId.toString()),
    tags: book.tags,
    files: book.files.map((file) => {
      if (!file._id) {
        throw new AppError('Book file metadata is corrupted.', 500)
      }

      return {
        id: file._id.toString(),
        provider: file.provider,
        key: file.key,
        url: file.url,
        contentType: file.contentType,
        size: file.size,
        originalFileName: file.originalFileName,
        uploadedAt: file.uploadedAt.toISOString(),
      }
    }),
    ratingAverage: book.ratingAverage,
    ratingCount: book.ratingCount,
    addedBy: book.addedBy.toString(),
    createdAt: book.createdAt.toISOString(),
    updatedAt: book.updatedAt.toISOString(),
  }
}

const validateAuthorAndCategoryLinks = async (
  authorIds: string[] | undefined,
  categoryIds: string[] | undefined,
) => {
  if (authorIds) {
    const uniqueAuthorIds = [...new Set(authorIds)]
    const count = await AuthorModel.countDocuments({
      _id: { $in: uniqueAuthorIds },
      isActive: true,
    })

    if (count !== uniqueAuthorIds.length) {
      throw new AppError('One or more authors are invalid or inactive.', 400)
    }
  }

  if (categoryIds) {
    const uniqueCategoryIds = [...new Set(categoryIds)]
    const count = await CategoryModel.countDocuments({
      _id: { $in: uniqueCategoryIds },
      isActive: true,
    })

    if (count !== uniqueCategoryIds.length) {
      throw new AppError('One or more categories are invalid or inactive.', 400)
    }
  }
}

const applyBookUpdates = async (
  book: IBook,
  payload: Partial<{
    title: string
    slug: string
    isbn: string
    summary: string
    description: string
    language: string
    pageCount: number
    publicationDate: Date
    coverImageUrl: string
    featured: boolean
    isAvailable: boolean
    authorIds: string[]
    categoryIds: string[]
    tags: string[]
  }>,
) => {
  if (typeof payload.slug === 'string') {
    const existingSlug = await BookModel.findOne({
      slug: payload.slug,
      _id: { $ne: book._id },
    })

    if (existingSlug) {
      throw new AppError('Book slug already exists.', 409)
    }

    book.slug = payload.slug
  }

  if (typeof payload.isbn === 'string') {
    const existingIsbn = await BookModel.findOne({
      isbn: payload.isbn,
      _id: { $ne: book._id },
    })

    if (existingIsbn) {
      throw new AppError('Book ISBN already exists.', 409)
    }

    book.isbn = payload.isbn
  }

  if (typeof payload.title === 'string') {
    book.title = payload.title
  }

  if (typeof payload.summary === 'string') {
    book.summary = payload.summary
  }

  if (typeof payload.description === 'string') {
    book.description = payload.description
  }

  if (typeof payload.language === 'string') {
    book.language = payload.language
  }

  if (typeof payload.pageCount === 'number') {
    book.pageCount = payload.pageCount
  }

  if (payload.publicationDate instanceof Date) {
    book.publicationDate = payload.publicationDate
  }

  if (typeof payload.coverImageUrl === 'string') {
    book.coverImageUrl = payload.coverImageUrl
  }

  if (typeof payload.featured === 'boolean') {
    book.featured = payload.featured
  }

  if (typeof payload.isAvailable === 'boolean') {
    book.isAvailable = payload.isAvailable
  }

  if (Array.isArray(payload.authorIds)) {
    book.authorIds = toObjectIdArray(payload.authorIds)
  }

  if (Array.isArray(payload.categoryIds)) {
    book.categoryIds = toObjectIdArray(payload.categoryIds)
  }

  if (Array.isArray(payload.tags)) {
    book.tags = [...new Set(payload.tags)]
  }
}

export const booksService = {
  listPublicBooks: async (query: BookQuery) => {
    const pagination = getPaginationState(query)
    const filter: Record<string, unknown> = { isAvailable: true }

    if (typeof query.featured === 'boolean') {
      filter.featured = query.featured
    }

    if (query.authorId) {
      filter.authorIds = new Types.ObjectId(query.authorId)
    }

    if (query.categoryId) {
      filter.categoryIds = new Types.ObjectId(query.categoryId)
    }

    if (query.search) {
      filter.$text = { $search: query.search }
    }

    const projection = query.search ? { score: { $meta: 'textScore' } } : {}

    const [books, total] = await Promise.all([
      BookModel.find(filter, projection)
        .sort(
          query.search
            ? ({ score: { $meta: 'textScore' }, createdAt: -1 } as const)
            : ({ featured: -1, createdAt: -1 } as const),
        )
        .skip(pagination.skip)
        .limit(pagination.limit),
      BookModel.countDocuments(filter),
    ])

    return {
      meta: createPaginationMeta(pagination, total),
      data: books.map((book) => formatBook(book)),
    }
  },

  listFeaturedBooks: async (limit = 12) => {
    const books = await BookModel.find({
      isAvailable: true,
      featured: true,
    })
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(limit)

    return books.map((book) => formatBook(book))
  },

  getPublicBookById: async (id: string) => {
    const book = await BookModel.findOne({ _id: id, isAvailable: true })
    return formatBook(book)
  },

  getBookPreview: async (id: string) => {
    const book = await BookModel.findOne({ _id: id, isAvailable: true })

    if (!book) {
      throw new AppError('Book not found.', 404)
    }

    return {
      id: book._id.toString(),
      title: book.title,
      slug: book.slug,
      summary: book.summary,
      coverImageUrl: book.coverImageUrl,
      featured: book.featured,
      isAvailable: book.isAvailable,
      authorIds: book.authorIds.map((authorId) => authorId.toString()),
      categoryIds: book.categoryIds.map((categoryId) => categoryId.toString()),
      publicationDate: book.publicationDate?.toISOString(),
      createdAt: book.createdAt.toISOString(),
      updatedAt: book.updatedAt.toISOString(),
    }
  },

  getBookReviewSummary: async (id: string) => {
    const book = await BookModel.findOne({ _id: id, isAvailable: true })

    if (!book) {
      throw new AppError('Book not found.', 404)
    }

    return {
      bookId: book._id.toString(),
      ratingAverage: book.ratingAverage,
      ratingCount: book.ratingCount,
      reviews: [],
    }
  },

  createBook: async (
    staffId: string,
    payload: {
      title: string
      slug: string
      isbn?: string
      summary: string
      description?: string
      language: string
      pageCount?: number
      publicationDate?: Date
      coverImageUrl?: string
      featured: boolean
      isAvailable: boolean
      authorIds: string[]
      categoryIds: string[]
      tags: string[]
    },
  ) => {
    const [existingSlug, existingIsbn] = await Promise.all([
      BookModel.findOne({ slug: payload.slug }),
      payload.isbn ? BookModel.findOne({ isbn: payload.isbn }) : null,
    ])

    if (existingSlug) {
      throw new AppError('Book slug already exists.', 409)
    }

    if (existingIsbn) {
      throw new AppError('Book ISBN already exists.', 409)
    }

    await validateAuthorAndCategoryLinks(payload.authorIds, payload.categoryIds)

    const book = await BookModel.create({
      title: payload.title,
      slug: payload.slug,
      isbn: payload.isbn,
      summary: payload.summary,
      description: payload.description,
      language: payload.language,
      pageCount: payload.pageCount,
      publicationDate: payload.publicationDate,
      coverImageUrl: payload.coverImageUrl,
      featured: payload.featured,
      isAvailable: payload.isAvailable,
      authorIds: toObjectIdArray(payload.authorIds),
      categoryIds: toObjectIdArray(payload.categoryIds),
      tags: [...new Set(payload.tags)],
      addedBy: new Types.ObjectId(staffId),
    })

    return formatBook(book)
  },

  updateBook: async (
    id: string,
    payload: Partial<{
      title: string
      slug: string
      isbn: string
      summary: string
      description: string
      language: string
      pageCount: number
      publicationDate: Date
      coverImageUrl: string
      featured: boolean
      isAvailable: boolean
      authorIds: string[]
      categoryIds: string[]
      tags: string[]
    }>,
  ) => {
    const book = await BookModel.findById(id)

    if (!book) {
      throw new AppError('Book not found.', 404)
    }

    await validateAuthorAndCategoryLinks(payload.authorIds, payload.categoryIds)
    await applyBookUpdates(book, payload)

    await book.save()

    return formatBook(book)
  },

  deleteBook: async (id: string) => {
    const book = await BookModel.findById(id)

    if (!book) {
      throw new AppError('Book not found.', 404)
    }

    await book.deleteOne()
  },

  setBookFeatured: async (id: string, featured: boolean) => {
    const book = await BookModel.findById(id)

    if (!book) {
      throw new AppError('Book not found.', 404)
    }

    book.featured = featured
    await book.save()

    return formatBook(book)
  },

  setBookAvailability: async (id: string, isAvailable: boolean) => {
    const book = await BookModel.findById(id)

    if (!book) {
      throw new AppError('Book not found.', 404)
    }

    book.isAvailable = isAvailable
    await book.save()

    return formatBook(book)
  },

  addBookFile: async (
    id: string,
    payload: {
      fileName: string
      contentType: string
      fileBase64?: string
      folder?: string
      provider?: string
      key?: string
      url?: string
      size?: number
    },
  ) => {
    const book = await BookModel.findById(id)

    if (!book) {
      throw new AppError('Book not found.', 404)
    }

    const hasUploadPayload = typeof payload.fileBase64 === 'string'

    if (hasUploadPayload) {
      const upload = await storageService.uploadFile({
        fileName: payload.fileName,
        contentType: payload.contentType,
        buffer: parseBase64(payload.fileBase64 as string),
        folder: payload.folder ?? `books/${book._id.toString()}`,
      })

      book.files.push({
        provider: 'cloudinary',
        key: upload.key,
        url: upload.url,
        contentType: upload.contentType,
        size: upload.size,
        originalFileName: payload.fileName,
        uploadedAt: new Date(),
      })
    } else {
      if (
        typeof payload.key !== 'string' ||
        typeof payload.url !== 'string' ||
        typeof payload.size !== 'number'
      ) {
        throw new AppError('Invalid file metadata payload.', 400)
      }

      book.files.push({
        provider: payload.provider ?? 'cloudinary',
        key: payload.key,
        url: payload.url,
        contentType: payload.contentType,
        size: payload.size,
        originalFileName: payload.fileName,
        uploadedAt: new Date(),
      })
    }

    await book.save()

    const file = book.files[book.files.length - 1]

    if (!file || !file._id) {
      throw new AppError('Book file metadata could not be saved.', 500)
    }

    return {
      id: file._id.toString(),
      provider: file.provider,
      key: file.key,
      url: file.url,
      contentType: file.contentType,
      size: file.size,
      originalFileName: file.originalFileName,
      uploadedAt: file.uploadedAt.toISOString(),
    }
  },

  deleteBookFile: async (bookId: string, fileId: string) => {
    const book = await BookModel.findById(bookId)

    if (!book) {
      throw new AppError('Book not found.', 404)
    }

    const targetFile = book.files.find(
      (file) => file._id?.toString() === fileId,
    )

    if (!targetFile || !targetFile._id) {
      throw new AppError('Book file not found.', 404)
    }

    book.files = book.files.filter((file) => file._id?.toString() !== fileId)

    await book.save()

    return {
      id: targetFile._id.toString(),
      key: targetFile.key,
      provider: targetFile.provider,
    }
  },

  bulkImportBooks: async (
    staffId: string,
    payload: {
      books: Array<{
        title: string
        slug: string
        isbn?: string
        summary: string
        description?: string
        language: string
        pageCount?: number
        publicationDate?: Date
        coverImageUrl?: string
        featured: boolean
        isAvailable: boolean
        authorIds: string[]
        categoryIds: string[]
        tags: string[]
      }>
    },
  ) => {
    const results: Array<
      | { slug: string; success: true; data: ReturnType<typeof formatBook> }
      | { slug: string; success: false; error: string }
    > = []

    for (const input of payload.books) {
      try {
        const data = await booksService.createBook(staffId, input)
        results.push({ slug: input.slug, success: true, data })
      } catch (error) {
        results.push({
          slug: input.slug,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    const successCount = results.filter((result) => result.success).length

    return {
      total: payload.books.length,
      successCount,
      failedCount: payload.books.length - successCount,
      results,
    }
  },
}
