import { RequestHandler } from 'express'
import { AppError } from '../errors/AppError'

export const getIdParam = (request: Parameters<RequestHandler>[0]): string => {
  const id = request.params.id

  if (typeof id !== 'string') {
    throw new AppError('Invalid id parameter.', 400)
  }

  return id
}

export const getFileIdParam = (
  request: Parameters<RequestHandler>[0],
): string => {
  const fileId = request.params.fid

  if (typeof fileId !== 'string') {
    throw new AppError('Invalid file id parameter.', 400)
  }

  return fileId
}

export const getStaffId = (request: any): string => {
  const staffId = request.user?.id

  if (typeof staffId !== 'string') {
    throw new AppError('Unauthorized.', 401)
  }

  return staffId
}
