import { z } from 'zod'

import { idParamSchema, paginationSchema } from '../../common/validators/common'

const objectIdString = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId format')

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const baseBookBodySchema = z.object({
  title: z.string().trim().min(2).max(200),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(220)
    .toLowerCase()
    .regex(slugRegex, 'Slug must be lowercase alphanumeric with hyphens'),
  isbn: z.string().trim().min(8).max(40).optional(),
  summary: z.string().trim().min(10).max(2000),
  description: z.string().trim().min(10).max(10000).optional(),
  language: z.string().trim().min(2).max(20).default('en'),
  pageCount: z.coerce.number().int().min(1).max(100000).optional(),
  publicationDate: z.coerce.date().optional(),
  coverImageUrl: z.string().trim().url().max(500).optional(),
  featured: z.boolean().default(false),
  isAvailable: z.boolean().default(true),
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
    provider: z.string().trim().min(2).max(30).optional(),
    key: z.string().trim().min(1).max(300).optional(),
    url: z.string().trim().url().max(800).optional(),
    size: z.coerce.number().int().min(1).optional(),
  })
  .refine(
    (value) => {
      const hasUploadPayload = typeof value.fileBase64 === 'string'
      const hasMetadataPayload =
        typeof value.key === 'string' &&
        typeof value.url === 'string' &&
        typeof value.size === 'number'

      return hasUploadPayload || hasMetadataPayload
    },
    {
      message: 'Either fileBase64 or key/url/size metadata must be provided',
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
    isAvailable: z.coerce.boolean().optional(),
    authorId: objectIdString.optional(),
    categoryId: objectIdString.optional(),
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
  toggleAvailabilityBody: z.object({
    isAvailable: z.boolean(),
  }),
  addFileBody: addFileBodySchema,
}
