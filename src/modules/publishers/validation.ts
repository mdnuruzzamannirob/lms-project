import { z } from 'zod'
import { idParamSchema, paginationSchema } from '../../common/validators/common'

const basePublisherBodySchema = z.object({
  name: z.string().trim().min(2).max(200),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(220)
    .toLowerCase()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug must be lowercase alphanumeric with hyphens',
    ),
  description: z.string().trim().min(3).max(2000).optional(),
  website: z.string().trim().url().max(500).optional(),
  logo: z
    .object({
      publicId: z.string().trim().min(1).max(300),
      url: z.string().trim().url().max(800),
    })
    .optional(),
  country: z.string().trim().min(2).max(100).optional(),
  foundedYear: z.coerce
    .number()
    .int()
    .min(1000)
    .max(new Date().getFullYear())
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
    .refine((v) => Object.keys(v).length > 0, {
      message: 'At least one field is required for update',
    }),
}
