import { z } from 'zod'

import { idParamSchema } from '../../common/validators/common'

export const staffValidation = {
  idParam: idParamSchema,
  inviteBody: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email(),
    roleId: z
      .string()
      .trim()
      .regex(/^[a-f\d]{24}$/i, 'Invalid role ObjectId'),
    phone: z.string().trim().min(6).max(32).optional(),
    expiresInDays: z.coerce.number().int().min(1).max(30).default(7),
  }),
  updateRoleBody: z.object({
    roleId: z
      .string()
      .trim()
      .regex(/^[a-f\d]{24}$/i, 'Invalid role ObjectId'),
  }),
}
