import { z } from 'zod'

export const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId format')

export const optionalObjectIdSchema = objectIdSchema.optional()
