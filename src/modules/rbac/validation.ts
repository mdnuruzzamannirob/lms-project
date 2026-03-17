import { z } from 'zod'

import { idParamSchema } from '../../common/validators/common'

export const rbacValidation = {
  idParam: idParamSchema,
  createRoleBody: z.object({
    name: z.string().trim().min(2).max(60),
    description: z.string().trim().min(3).max(300),
    permissions: z.array(z.string().trim().min(2)).min(1),
    isSystem: z.boolean().optional(),
  }),
  updateRoleBody: z
    .object({
      name: z.string().trim().min(2).max(60).optional(),
      description: z.string().trim().min(3).max(300).optional(),
      permissions: z.array(z.string().trim().min(2)).min(1).optional(),
    })
    .refine(
      (value) =>
        typeof value.name !== 'undefined' ||
        typeof value.description !== 'undefined' ||
        typeof value.permissions !== 'undefined',
      {
        message: 'At least one field is required for role update',
      },
    ),
}
