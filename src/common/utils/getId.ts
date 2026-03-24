import type { RequestHandler } from 'express'
import { AppError } from '../errors/AppError'

export const getUserId = (request: Parameters<RequestHandler>[0]): string => {
  if (!request.auth || request.auth.type !== 'user') {
    throw new AppError('User authentication is required.', 401)
  }

  return request.auth.sub
}

export const getBookId = (request: Parameters<RequestHandler>[0]): string => {
  const bookId = request.params.bookId

  if (typeof bookId !== 'string') {
    throw new AppError('Invalid book id parameter.', 400)
  }

  return bookId
}

export const getEntityId = (request: Parameters<RequestHandler>[0]): string => {
  const id = request.params.id

  if (typeof id !== 'string') {
    throw new AppError('Invalid id parameter.', 400)
  }

  return id
}

export const getStaffId = (request: Parameters<RequestHandler>[0]): string => {
  if (!request.auth || request.auth.type !== 'staff') {
    throw new AppError('Staff authentication is required.', 401)
  }

  return request.auth.sub
}

export const getNotificationId = (
  request: Parameters<RequestHandler>[0],
): string => {
  const id = request.params.id
  if (typeof id !== 'string') {
    throw new AppError('Invalid notification id parameter.', 400)
  }
  return id
}
