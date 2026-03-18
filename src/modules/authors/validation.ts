import { z } from 'zod'

import { idParamSchema, paginationSchema } from '../../common/validators/common'

const countryCodeSchema = z.string().trim().min(2).max(3).toUpperCase()

const baseAuthorBodySchema = z.object({
  name: z.string().trim().min(2).max(150),
  bio: z.string().trim().min(3).max(3000).optional(),
  countryCode: countryCodeSchema.optional(),
  avatarUrl: z.string().trim().url().max(500).optional(),
  website: z.string().trim().url().max(500).optional(),
  isActive: z.boolean().default(true),
})

export const authorsValidation = {
  idParam: idParamSchema,
  query: paginationSchema.extend({
    search: z.string().trim().min(1).max(200).optional(),
    isActive: z.coerce.boolean().optional(),
  }),
  createBody: baseAuthorBodySchema,
  updateBody: baseAuthorBodySchema
    .partial()
    .refine((value) => Object.keys(value).length > 0, {
      message: 'At least one field is required for update',
    }),
}
