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
import { PublisherModel } from '../publishers/model'
import type {
  AddBookFilePayload,
  BookAvailabilityStatus,
  BookFileFormat,
  BookStatus,
  BooksListQuery,
  BulkImportBooksPayload,
  CreateBookPayload,
  IBook,
  UpdateBookPayload,
} from './interface'
import { BookModel } from './model'

const allowedBookFormats = new Set<BookFileFormat>([
  'pdf',
  'epub',
  'mobi',
  'txt',
  'azw3',
])

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

const stripHtml = (value: string) =>
  value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const sanitizeRequiredText = (
  value: string,
  fieldName: string,
  minLength = 1,
) => {
  const sanitized = stripHtml(value)

  if (sanitized.length < minLength) {
    throw new AppError(`${fieldName} is invalid after sanitization.`, 400)
  }

  return sanitized
}

const sanitizeOptionalText = (value: string | null | undefined) => {
  if (typeof value !== 'string') {
    return value
  }

  const sanitized = stripHtml(value)
  return sanitized.length > 0 ? sanitized : null
}

const sanitizeTags = (tags: string[]) => [
  ...new Set(tags.map((tag) => stripHtml(tag).toLowerCase()).filter(Boolean)),
]

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
    coverImage: book.coverImage ?? null,
    edition: book.edition,
    featured: book.featured,
    availabilityStatus: book.availabilityStatus,
    accessLevel: book.accessLevel,
    status: book.status,
    authorIds: book.authorIds.map((authorId) => authorId.toString()),
    categoryIds: book.categoryIds.map((categoryId) => categoryId.toString()),
    publisherId: book.publisherId?.toString(),
    tags: book.tags,
    files: book.files.map((file) => {
      if (!file._id) {
        throw new AppError('Book file metadata is corrupted.', 500)
      }

      return {
        id: file._id.toString(),
        provider: file.provider,
        publicId: file.publicId,
        url: file.url,
        format: file.format,
        resourceType: file.resourceType,
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

const validatePublisherLink = async (
  publisherId: string | null | undefined,
) => {
  if (!publisherId) {
    return
  }

  const publisher = await PublisherModel.findOne({
    _id: publisherId,
    isActive: true,
  })

  if (!publisher) {
    throw new AppError('Publisher is invalid or inactive.', 400)
  }
}

const applyBookUpdates = async (book: IBook, payload: UpdateBookPayload) => {
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

  if (payload.isbn === null) {
    book.isbn = null
  }

  if (typeof payload.title === 'string') {
    book.title = sanitizeRequiredText(payload.title, 'Title', 2)
  }

  if (typeof payload.summary === 'string') {
    book.summary = sanitizeRequiredText(payload.summary, 'Summary', 10)
  }

  if (typeof payload.description !== 'undefined') {
    book.description = sanitizeOptionalText(payload.description) ?? null
  }

  if (typeof payload.language === 'string') {
    book.language = payload.language
  }

  if (typeof payload.pageCount === 'number' || payload.pageCount === null) {
    book.pageCount = payload.pageCount
  }

  if (
    payload.publicationDate instanceof Date ||
    payload.publicationDate === null
  ) {
    book.publicationDate = payload.publicationDate
  }

  if (payload.coverImage) {
    book.coverImage = payload.coverImage
  }

  if (typeof payload.publisherId !== 'undefined') {
    book.publisherId = payload.publisherId
      ? new Types.ObjectId(payload.publisherId)
      : null
  }

  if (typeof payload.accessLevel === 'string') {
    book.accessLevel = payload.accessLevel
  }

  if (typeof payload.status === 'string') {
    book.status = payload.status
  }

  if (typeof payload.edition === 'string') {
    book.edition = sanitizeRequiredText(payload.edition, 'Edition', 1)
  }

  if (payload.edition === null) {
    book.edition = null
  }

  if (typeof payload.featured === 'boolean') {
    book.featured = payload.featured
  }

  if (typeof payload.availabilityStatus === 'string') {
    book.availabilityStatus = payload.availabilityStatus
  }

  if (Array.isArray(payload.authorIds)) {
    book.authorIds = toObjectIdArray(payload.authorIds)
  }

  if (Array.isArray(payload.categoryIds)) {
    book.categoryIds = toObjectIdArray(payload.categoryIds)
  }

  if (Array.isArray(payload.tags)) {
    book.tags = sanitizeTags(payload.tags)
  }
}

export const booksService = {
  listPublicBooks: async (query: BooksListQuery) => {
    const pagination = getPaginationState(query)
    const filter: Record<string, unknown> = {
      status: query.status ?? 'published',
      availabilityStatus: query.availabilityStatus ?? 'available',
    }

    if (typeof query.featured === 'boolean') {
      filter.featured = query.featured
    }

    if (query.authorId) {
      filter.authorIds = new Types.ObjectId(query.authorId)
    }

    if (query.categoryId) {
      filter.categoryIds = new Types.ObjectId(query.categoryId)
    }

    if (query.publisherId) {
      filter.publisherId = new Types.ObjectId(query.publisherId)
    }

    if (query.accessLevel) {
      filter.accessLevel = query.accessLevel
    }

    if (query.language) {
      filter.language = query.language
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
      status: 'published',
      availabilityStatus: 'available',
      featured: true,
    })
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(limit)

    return books.map((book) => formatBook(book))
  },

  getPublicBookById: async (id: string) => {
    const book = await BookModel.findOne({
      _id: id,
      status: 'published',
      availabilityStatus: 'available',
    })
    return formatBook(book)
  },

  getBookPreview: async (id: string) => {
    const book = await BookModel.findOne({
      _id: id,
      status: 'published',
      availabilityStatus: 'available',
    })

    if (!book) {
      throw new AppError('Book not found.', 404)
    }

    return {
      id: book._id.toString(),
      title: book.title,
      slug: book.slug,
      summary: book.summary,
      coverImage: book.coverImage ?? null,
      featured: book.featured,
      availabilityStatus: book.availabilityStatus,
      authorIds: book.authorIds.map((authorId) => authorId.toString()),
      categoryIds: book.categoryIds.map((categoryId) => categoryId.toString()),
      publicationDate: book.publicationDate?.toISOString(),
      createdAt: book.createdAt.toISOString(),
      updatedAt: book.updatedAt.toISOString(),
    }
  },

  getBookReviewSummary: async (id: string) => {
    const book = await BookModel.findOne({
      _id: id,
      status: 'published',
      availabilityStatus: 'available',
    })

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

  createBook: async (staffId: string, payload: CreateBookPayload) => {
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

    await Promise.all([
      validateAuthorAndCategoryLinks(payload.authorIds, payload.categoryIds),
      validatePublisherLink(payload.publisherId),
    ])

    const book = await BookModel.create({
      title: sanitizeRequiredText(payload.title, 'Title', 2),
      slug: payload.slug,
      isbn: payload.isbn ?? null,
      summary: sanitizeRequiredText(payload.summary, 'Summary', 10),
      description: sanitizeOptionalText(payload.description) ?? null,
      language: payload.language,
      pageCount: payload.pageCount ?? null,
      publicationDate: payload.publicationDate ?? null,
      coverImage: payload.coverImage,
      publisherId: payload.publisherId
        ? new Types.ObjectId(payload.publisherId)
        : null,
      accessLevel: payload.accessLevel,
      status: payload.status,
      edition:
        typeof payload.edition === 'string'
          ? sanitizeRequiredText(payload.edition, 'Edition', 1)
          : (payload.edition ?? null),
      featured: payload.featured,
      availabilityStatus: payload.availabilityStatus,
      authorIds: toObjectIdArray(payload.authorIds),
      categoryIds: toObjectIdArray(payload.categoryIds),
      tags: sanitizeTags(payload.tags),
      addedBy: new Types.ObjectId(staffId),
    })

    return formatBook(book)
  },

  updateBook: async (id: string, payload: UpdateBookPayload) => {
    const book = await BookModel.findById(id)

    if (!book) {
      throw new AppError('Book not found.', 404)
    }

    await Promise.all([
      validateAuthorAndCategoryLinks(payload.authorIds, payload.categoryIds),
      validatePublisherLink(payload.publisherId),
    ])

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
    const book = await BookModel.findByIdAndUpdate(
      id,
      { $set: { featured } },
      { new: true },
    )

    if (!book) {
      throw new AppError('Book not found.', 404)
    }

    return formatBook(book)
  },

  setBookStatus: async (id: string, status: BookStatus) => {
    const book = await BookModel.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true },
    )

    if (!book) {
      throw new AppError('Book not found.', 404)
    }

    return formatBook(book)
  },

  setBookAvailability: async (
    id: string,
    availabilityStatus: BookAvailabilityStatus,
  ) => {
    const book = await BookModel.findByIdAndUpdate(
      id,
      { $set: { availabilityStatus } },
      { new: true },
    )

    if (!book) {
      throw new AppError('Book not found.', 404)
    }

    return formatBook(book)
  },

  addBookFile: async (id: string, payload: AddBookFilePayload) => {
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

      if (!allowedBookFormats.has(upload.format as BookFileFormat)) {
        throw new AppError('Uploaded file format is not supported.', 400)
      }

      book.files.push({
        provider: 'cloudinary',
        publicId: upload.publicId,
        url: upload.url,
        format: upload.format as BookFileFormat,
        size: upload.size,
        originalFileName: upload.originalFileName,
        resourceType: 'raw',
        uploadedAt: new Date(),
      })
    } else {
      if (
        typeof payload.publicId !== 'string' ||
        typeof payload.url !== 'string' ||
        typeof payload.format !== 'string' ||
        typeof payload.size !== 'number'
      ) {
        throw new AppError('Invalid file metadata payload.', 400)
      }

      if (!allowedBookFormats.has(payload.format)) {
        throw new AppError('File format is not supported.', 400)
      }

      book.files.push({
        provider: 'cloudinary',
        publicId: payload.publicId,
        url: payload.url,
        format: payload.format,
        size: payload.size,
        originalFileName: payload.fileName,
        resourceType: payload.resourceType ?? 'raw',
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
      publicId: file.publicId,
      url: file.url,
      format: file.format,
      resourceType: file.resourceType,
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
      publicId: targetFile.publicId,
      provider: targetFile.provider,
    }
  },

  bulkImportBooks: async (staffId: string, payload: BulkImportBooksPayload) => {
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
