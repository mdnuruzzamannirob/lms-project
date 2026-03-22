import type { RequestHandler } from 'express'
import { BookModel } from '../../modules/books/model'
import { AppError } from '../errors/AppError'
import { subscriptionAccessService } from '../services/subscription.service'

export const checkSubscriptionAccess: RequestHandler = async (
  req,
  _res,
  next,
) => {
  try {
    const userId = req.auth?.id
    if (!userId) throw new AppError('Unauthorized.', 401)

    const bookId = req.params.id ?? req.params.bookId
    if (!bookId) throw new AppError('Book ID is required.', 400)

    const book = await BookModel.findById(bookId)
      .select('accessLevel isAvailable')
      .lean()
    if (!book) throw new AppError('Book not found.', 404)
    if (!(book as any).isAvailable)
      throw new AppError('This book is currently unavailable.', 403)

    const { hasAccess, reason } =
      await subscriptionAccessService.checkUserAccess(
        userId,
        (book as any).accessLevel,
      )

    if (!hasAccess) throw new AppError(reason ?? 'Access denied.', 403)

    next()
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError('Failed to verify subscription access.', 500),
    )
  }
}
