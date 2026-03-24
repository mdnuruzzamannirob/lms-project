import { Types } from "mongoose"
import { AppError } from "../../common/errors/AppError"
import { BookModel } from "../books"
import { IReview } from "./interface"
import { ReviewModel } from "./model"

export const ensureBookExists = async (bookId: string) => {
  const book = await BookModel.findById(bookId)

  if (!book) {
    throw new AppError('Book not found.', 404)
  }

  return book
}

export const formatReview = (review: IReview | null) => {
  if (!review) {
    throw new AppError('Review not found.', 404)
  }

  return {
    id: review._id.toString(),
    userId: review.userId.toString(),
    bookId: review.bookId.toString(),
    rating: review.rating,
    title: review.title,
    comment: review.comment,
    isVisible: review.isVisible,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  }
}

export const recomputeBookReviewStats = async (bookId: string) => {
  const rows: Array<{ average: number; count: number }> =
    await ReviewModel.aggregate([
      {
        $match: {
          bookId: new Types.ObjectId(bookId),
          isVisible: true,
        },
      },
      {
        $group: {
          _id: null,
          average: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
    ])

  const row = rows[0]

  const average = row ? Number(row.average.toFixed(2)) : 0
  const count = row?.count ?? 0

  await BookModel.findByIdAndUpdate(bookId, {
    ratingAverage: average,
    ratingCount: count,
  })

  return {
    ratingAverage: average,
    ratingCount: count,
  }
}
