import { NextFunction, Request, Response } from 'express'
import env from '../config/env'

interface MongoError extends Error {
  code?: number
  keyValue?: Record<string, unknown>
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const errorHandler = (
  err: MongoError,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // MongoDB duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue ?? {})[0] ?? 'field'
    res
      .status(409)
      .json({ success: false, message: `${field} already exists.` })
    return
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    res
      .status(422)
      .json({
        success: false,
        message: 'Validation failed.',
        errors: err.message,
      })
    return
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({ success: false, message: 'Invalid token.' })
    return
  }
  if (err.name === 'TokenExpiredError') {
    res.status(401).json({ success: false, message: 'Token expired.' })
    return
  }

  const statusCode = (err as { statusCode?: number }).statusCode ?? 500
  const message =
    env.NODE_ENV === 'production' && statusCode === 500
      ? 'Internal server error.'
      : err.message || 'Internal server error.'

  res.status(statusCode).json({ success: false, message })
}

export default errorHandler
