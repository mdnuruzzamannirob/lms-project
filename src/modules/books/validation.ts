import { z } from 'zod'

import { idParamSchema, paginationSchema } from '../../common/validators/common'

const objectIdString = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId format')

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const bookLanguageEnum = z.enum(['bn', 'en', 'hi'])
const bookAccessLevelEnum = z.enum(['free', 'basic', 'premium'])
const bookStatusEnum = z.enum(['draft', 'published', 'archived'])
const bookAvailabilityStatusEnum = z.enum([
  'available',
  'unavailable',
  'coming_soon',
])
const bookFileFormatEnum = z.enum(['pdf', 'epub', 'mobi', 'txt', 'azw3'])

const coverImageSchema = z.object({
  provider: z.enum(['cloudinary']).default('cloudinary'),
  publicId: z.string().trim().min(1).max(300),
  url: z.string().trim().url().max(800),
  width: z.coerce.number().int().min(1),
  height: z.coerce.number().int().min(1),
})

const baseBookBodySchema = z.object({
  title: z.string().trim().min(2).max(200),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(220)
    .toLowerCase()
    .regex(slugRegex, 'Slug must be lowercase alphanumeric with hyphens'),

  isbn: z.string().trim().min(8).max(40).nullable().optional(),
  summary: z.string().trim().min(10).max(2000),
  description: z.string().trim().min(10).max(10000).nullable().optional(),
  language: bookLanguageEnum.default('en'),
  pageCount: z.coerce.number().int().min(1).max(100000).nullable().optional(),
  publicationDate: z.coerce.date().nullable().optional(),
  edition: z.string().trim().min(1).max(50).nullable().optional(),

  coverImage: coverImageSchema,

  publisherId: objectIdString.nullable().optional(),

  accessLevel: bookAccessLevelEnum.default('free'),
  featured: z.boolean().default(false),
  status: bookStatusEnum.default('draft'),
  availabilityStatus: bookAvailabilityStatusEnum.default('available'),

  authorIds: z.array(objectIdString).min(1).max(20),
  categoryIds: z.array(objectIdString).min(1).max(20),
  tags: z.array(z.string().trim().min(1).max(80)).max(40).default([]),
})

const addFileBodySchema = z
  .object({
    fileName: z.string().trim().min(1).max(255),
    contentType: z.string().trim().min(3).max(120),
    fileBase64: z.string().trim().min(8).optional(),
    folder: z.string().trim().min(1).max(200).optional(),
    publicId: z.string().trim().min(1).max(300).optional(),
    url: z.string().trim().url().max(800).optional(),
    format: bookFileFormatEnum.optional(),
    resourceType: z.enum(['raw']).default('raw'),
    size: z.coerce.number().int().min(1).optional(),
  })
  .refine(
    (value) => {
      const hasUploadPayload = typeof value.fileBase64 === 'string'
      const hasMetadataPayload =
        typeof value.publicId === 'string' &&
        typeof value.url === 'string' &&
        typeof value.format === 'string' &&
        typeof value.size === 'number'

      return hasUploadPayload || hasMetadataPayload
    },
    {
      message:
        'Either fileBase64 or publicId/url/format/size metadata must be provided',
    },
  )

export const booksValidation = {
  idParam: idParamSchema,

  idWithFileParam: z.object({
    id: idParamSchema.shape.id,
    fid: idParamSchema.shape.id,
  }),

  query: paginationSchema.extend({
    search: z.string().trim().min(1).max(200).optional(),
    featured: z.coerce.boolean().optional(),
    status: bookStatusEnum.optional(),
    availabilityStatus: bookAvailabilityStatusEnum.optional(),
    authorId: objectIdString.optional(),
    categoryId: objectIdString.optional(),
    publisherId: objectIdString.optional(),
    accessLevel: bookAccessLevelEnum.optional(),
    language: bookLanguageEnum.optional(),
  }),

  createBody: baseBookBodySchema,

  updateBody: baseBookBodySchema
    .partial()
    .refine((value) => Object.keys(value).length > 0, {
      message: 'At least one field is required for update',
    }),

  bulkImportBody: z.object({
    books: z.array(baseBookBodySchema).min(1).max(500),
  }),

  toggleFeaturedBody: z.object({
    featured: z.boolean(),
  }),

  setStatusBody: z.object({
    status: bookStatusEnum,
  }),

  setAvailabilityBody: z.object({
    availabilityStatus: bookAvailabilityStatusEnum,
  }),

  addFileBody: addFileBodySchema,
}
