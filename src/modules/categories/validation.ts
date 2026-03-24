import { z } from 'zod'

import { idParamSchema, paginationSchema } from '../../common/validators/common'

const objectIdString = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId format')

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const baseCategoryBodySchema = z.object({
  name: z.string().trim().min(2).max(120),

  slug: z
    .string()
    .trim()
    .min(2)
    .max(140)
    .toLowerCase()
    .regex(slugRegex, 'Slug must be lowercase alphanumeric with hyphens'),

  description: z.string().trim().min(3).max(2000).nullable().optional(),
  parentId: objectIdString.nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
})

export const categoriesValidation = {
  idParam: idParamSchema,

  query: paginationSchema.extend({
    search: z.string().trim().min(1).max(200).optional(),
    includeInactive: z.coerce.boolean().default(false),
    tree: z.coerce.boolean().default(false),
    parentId: objectIdString.optional(),
  }),

  createBody: baseCategoryBodySchema,

  updateBody: baseCategoryBodySchema
    .partial()
    .refine((value) => Object.keys(value).length > 0, {
      message: 'At least one field is required for update',
    }),
}
