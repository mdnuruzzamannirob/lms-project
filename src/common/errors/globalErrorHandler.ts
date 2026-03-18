import type { ErrorRequestHandler } from 'express'
import httpStatus from 'http-status'
import mongoose from 'mongoose'
import { ZodError } from 'zod'
import { fromZodError } from 'zod-validation-error'

import { logger } from '../../config/logger'
import { AppError } from './AppError'
import { handleCastError } from './handleCastError'
import { handleDuplicateError } from './handleDuplicateError'
import { handleValidationError } from './handleValidationError'

export const globalErrorHandler: ErrorRequestHandler = (
  error,
  request,
  response,
  next,
) => {
  void next

  let normalizedError: AppError

  if (error instanceof AppError) {
    normalizedError = error
  } else if (error instanceof ZodError) {
    const zodMessage = fromZodError(error).toString()
    normalizedError = handleValidationError(
      error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    )
    normalizedError.message = zodMessage
  } else if (error instanceof mongoose.Error.CastError) {
    normalizedError = handleCastError(error)
  } else if (error instanceof mongoose.Error.ValidationError) {
    normalizedError = handleValidationError(
      Object.values(error.errors).map((issue) => ({
        path: issue.path,
        message: issue.message,
      })),
    )
  } else if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000
  ) {
    normalizedError = handleDuplicateError(
      error as { keyValue?: Record<string, unknown> },
    )
  } else {
    const message =
      error instanceof Error ? error.message : 'Internal server error'
    normalizedError = new AppError(message, httpStatus.INTERNAL_SERVER_ERROR)
  }

  logger.error(normalizedError.message, {
    requestId: request.id,
    method: request.method,
    url: request.originalUrl,
    statusCode: normalizedError.statusCode,
    stack: normalizedError.stack,
    details: normalizedError.details,
  })

  response.status(normalizedError.statusCode).json({
    success: false,
    message: normalizedError.message,
    data: null,
    meta: normalizedError.details
      ? { details: normalizedError.details, requestId: request.id }
      : { requestId: request.id },
  })
}
