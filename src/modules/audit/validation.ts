import { z } from 'zod'

import { paginationSchema } from '../../common/validators/common'

export const auditValidation = {
  createBody: z.object({
    actorType: z.enum(['staff', 'admin']),
    action: z.string().trim().min(2).max(120),
    module: z.string().trim().min(2).max(80),
    description: z.string().trim().min(2).max(1000),
    targetId: z.string().trim().min(1).max(120).optional(),
    targetType: z.string().trim().min(1).max(120).optional(),
    meta: z.record(z.unknown()).optional(),
  }),
  listQuery: paginationSchema.extend({
    actorType: z.enum(['staff', 'admin']).optional(),
    module: z.string().trim().min(1).max(80).optional(),
    action: z.string().trim().min(1).max(120).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  }),
  exportQuery: z.object({
    actorType: z.enum(['staff', 'admin']).optional(),
    module: z.string().trim().min(1).max(80).optional(),
    action: z.string().trim().min(1).max(120).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    format: z.enum(['json', 'csv']).default('csv'),
  }),
}
