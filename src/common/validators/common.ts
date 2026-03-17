import { z } from 'zod'

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export const sortSchema = z.object({
  sort: z.string().trim().optional(),
  order: z.enum(['asc', 'desc']).optional(),
})

export const searchSchema = z.object({
  search: z.string().trim().min(1).optional(),
})

export const idParamSchema = z.object({
  id: z
    .string()
    .trim()
    .regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId format'),
})

export const uuidSchema = z
  .string()
  .trim()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    'Invalid UUID format',
  )
