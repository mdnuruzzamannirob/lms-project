import { NextFunction, Request, Response } from 'express'
import passport from '../config/passport'
import { sendError } from '../utils/response'

export const authenticateUser = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  passport.authenticate(
    'user-jwt',
    { session: false },
    (err: Error, user: Express.User | false) => {
      if (err) return next(err)
      if (!user) return sendError(res, 'Unauthorized. Please log in.', 401)
      req.user = user
      return next()
    },
  )(req, res, next)
}

export const optionalAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  passport.authenticate(
    'user-jwt',
    { session: false },
    (_err: Error, user: Express.User | false) => {
      if (user) req.user = user
      next()
    },
  )(req, res, next)
}
