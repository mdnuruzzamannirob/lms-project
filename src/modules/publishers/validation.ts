import { z } from 'zod'
import { idParamSchema, paginationSchema } from '../../common/validators/common'

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const countryCodeSchema = z.string().trim().length(2).toUpperCase()

const basePublisherBodySchema = z.object({
  name: z.string().trim().min(2).max(200),

  slug: z
    .string()
    .trim()
    .min(2)
    .max(220)
    .toLowerCase()
    .regex(slugRegex, 'Slug must be lowercase alphanumeric with hyphens'),

  description: z.string().trim().min(3).max(2000).nullable().optional(),
  website: z.string().trim().url().max(500).nullable().optional(),

  logo: z
    .object({
      provider: z.enum(['cloudinary']).default('cloudinary'),
      publicId: z.string().trim().min(1).max(300),
      url: z.string().trim().url().max(800),
    })
    .nullable()
    .optional(),

  countryCode: countryCodeSchema.nullable().optional(),

  foundedYear: z.coerce
    .number()
    .int()
    .min(1000)
    .max(new Date().getFullYear())
    .nullable()
    .optional(),

  isActive: z.boolean().default(true),
})

export const publishersValidation = {
  idParam: idParamSchema,

  query: paginationSchema.extend({
    search: z.string().trim().min(1).max(200).optional(),
    isActive: z.coerce.boolean().optional(),
  }),

  createBody: basePublisherBodySchema,

  updateBody: basePublisherBodySchema
    .partial()
    .refine((value) => Object.keys(value).length > 0, {
      message: 'At least one field is required for update',
    }),
}
