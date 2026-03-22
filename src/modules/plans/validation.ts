import { z } from 'zod'

import { idParamSchema } from '../../common/validators/common'

const basePlanBodySchema = z.object({
  code: z.string().trim().min(2).max(30).toUpperCase(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().min(3).max(500),
  price: z.coerce.number().min(0),
  currency: z.string().trim().min(3).max(8).toUpperCase().default('BDT'),
  durationDays: z.coerce.number().int().min(1).max(3650),
  maxDevices: z.coerce.number().int().min(1).max(20).default(1),
  downloadEnabled: z.boolean().default(false),
  accessLevel: z.enum(['free', 'basic', 'premium']).default('free'),
  features: z.array(z.string().trim().min(1).max(200)).default([]),
  isFree: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).default(0),
})

export const plansValidation = {
  idParam: idParamSchema,
  query: z.object({
    includeInactive: z.coerce.boolean().default(false),
  }),
  createBody: basePlanBodySchema,
  updateBody: basePlanBodySchema
    .partial()
    .refine((payload) => Object.keys(payload).length > 0, {
      message: 'At least one field is required for update',
    }),
}
