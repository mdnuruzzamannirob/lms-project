import { Response } from 'express'

interface PaginationMeta {
  page: number
  limit: number
  total: number
}

export const sendSuccess = (
  res: Response,
  data: unknown = null,
  message = 'OK',
  statusCode = 200,
): Response => res.status(statusCode).json({ success: true, data, message })

export const sendCreated = (
  res: Response,
  data: unknown = null,
  message = 'Created',
): Response => sendSuccess(res, data, message, 201)

export const sendPaginated = (
  res: Response,
  data: unknown[],
  { page, limit, total }: PaginationMeta,
): Response =>
  res.status(200).json({
    success: true,
    data,
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
  })

export const sendError = (
  res: Response,
  message = 'Internal Server Error',
  statusCode = 500,
  errors: Record<string, string> | null = null,
): Response => {
  const body: Record<string, unknown> = { success: false, message }
  if (errors) body.errors = errors
  return res.status(statusCode).json(body)
}
