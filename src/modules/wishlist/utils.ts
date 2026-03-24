import { AppError } from '../../common/errors/AppError'
import { BookModel } from '../books'
import { IWishlist } from './interface'

export const ensureBookExists = async (bookId: string) => {
  const book = await BookModel.findById(bookId)

  if (!book) {
    throw new AppError('Book not found.', 404)
  }

  return book
}

export const formatWishlistItem = (item: IWishlist | null) => {
  if (!item) {
    throw new AppError('Wishlist item not found.', 404)
  }

  return {
    id: item._id.toString(),
    userId: item.userId.toString(),
    bookId: item.bookId.toString(),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }
}
