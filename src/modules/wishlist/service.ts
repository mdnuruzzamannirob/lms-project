import { Types } from 'mongoose'

import {
  createPaginationMeta,
  getPaginationState,
} from '../../common/utils/pagination'
import { ensureBookExists } from '../reviews'
import { WishlistModel } from './model'
import { formatWishlistItem } from './utils'

const getMyWishlist = async (
  userId: string,
  query: {
    page?: number
    limit?: number
  },
) => {
  const pagination = getPaginationState(query)
  const filter = {
    userId: new Types.ObjectId(userId),
  }

  const [rows, total] = await Promise.all([
    WishlistModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    WishlistModel.countDocuments(filter),
  ])

  return {
    meta: createPaginationMeta(pagination, total),
    data: rows.map((row) => formatWishlistItem(row)),
  }
}

const addToWishlist = async (userId: string, bookId: string) => {
  await ensureBookExists(bookId)

  const existing = await WishlistModel.findOne({ userId, bookId })

  if (existing) {
    return formatWishlistItem(existing)
  }

  const item = await WishlistModel.create({
    userId: new Types.ObjectId(userId),
    bookId: new Types.ObjectId(bookId),
  })

  return formatWishlistItem(item)
}

const removeFromWishlist = async (userId: string, bookId: string) => {
  const item = await WishlistModel.findOne({ userId, bookId })

  if (!item) {
    return
  }

  await item.deleteOne()
}

export const wishlistService = {
  getMyWishlist,
  addToWishlist,
  removeFromWishlist,
}
