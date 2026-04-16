import { z } from 'zod'

import { idParamSchema } from '../../common/validators/common'

const objectIdString = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId format')

export const subscriptionsValidation = {
  idParam: idParamSchema,
  createBody: z.object({
    userId: objectIdString,
    planId: objectIdString,
    autoRenew: z.boolean().default(true),
  }),
  cancelBody: z.object({
    reason: z.string().trim().min(3).max(200),
    immediate: z.boolean().default(false),
  }),
  changePlanBody: z.object({
    newPlanId: objectIdString,
  }),
  adminUpdateBody: z
    .object({
      status: z
        .enum([
          'pending',
          'active',
          'cancelled',
          'expired',
          'upgraded',
          'downgraded',
        ])
        .optional(),
      autoRenew: z.boolean().optional(),
      cancellationReason: z.string().trim().min(3).max(200).optional(),
    })
    .refine((payload) => Object.keys(payload).length > 0, {
      message: 'At least one field is required for subscription update',
    }),
}
