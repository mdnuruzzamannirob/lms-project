import { z } from 'zod'

import { paginationSchema } from '../../common/validators/common'
import { objectIdSchema } from '../../common/validators/objectId'

export const notificationsValidation = {
  listQuery: paginationSchema.extend({
    read: z.enum(['true', 'false']).optional(),
  }),
  idParam: z.object({
    id: objectIdSchema,
  }),
  bulkMarkBody: z.object({
    notificationIds: z.array(objectIdSchema).min(1),
  }),
  bulkSendBody: z.object({
    userIds: z.array(objectIdSchema).min(1),
    type: z.string(),
    title: z.string().min(1),
    body: z.string().min(1),
    relatedEntityId: objectIdSchema.optional(),
    relatedEntityType: z.string().optional(),
  }),
}
