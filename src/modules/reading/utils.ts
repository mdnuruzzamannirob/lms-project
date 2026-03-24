import { Types } from "mongoose"
import { AppError } from "../../common/errors/AppError"
import { BookModel } from "../books"
import { IBookmark, IHighlight, IReadingProgress, IReadingSession } from "./interface"
import { ReadingProgressModel } from "./model"

export const ensureBookReadable = async (bookId: string) => {
  const book = await BookModel.findOne({ _id: bookId, isAvailable: true })

  if (!book) {
    throw new AppError('Book not found or unavailable.', 404)
  }

  return book
}

export const formatReadingProgress = (progress: IReadingProgress | null) => {
  if (!progress) {
    throw new AppError('Reading progress not found.', 404)
  }

  return {
    id: progress._id.toString(),
    userId: progress.userId.toString(),
    bookId: progress.bookId.toString(),
    currentFileId: progress.currentFileId?.toString(),
    currentPage: progress.currentPage,
    progressPercentage: progress.progressPercentage,
    status: progress.status,
    startedAt: progress.startedAt.toISOString(),
    lastReadAt: progress.lastReadAt.toISOString(),
    completedAt: progress.completedAt?.toISOString(),
    createdAt: progress.createdAt.toISOString(),
    updatedAt: progress.updatedAt.toISOString(),
  }
}

export const formatSession = (session: IReadingSession | null) => {
  if (!session) {
    throw new AppError('Reading session not found.', 404)
  }

  return {
    id: session._id.toString(),
    userId: session.userId.toString(),
    bookId: session.bookId.toString(),
    fileId: session.fileId?.toString(),
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt.toISOString(),
    durationSeconds: session.durationSeconds,
    progressDelta: session.progressDelta,
    device: session.device,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  }
}

export const formatBookmark = (bookmark: IBookmark | null) => {
  if (!bookmark) {
    throw new AppError('Bookmark not found.', 404)
  }

  return {
    id: bookmark._id.toString(),
    userId: bookmark.userId.toString(),
    bookId: bookmark.bookId.toString(),
    fileId: bookmark.fileId?.toString(),
    location: bookmark.location,
    page: bookmark.page,
    note: bookmark.note,
    createdAt: bookmark.createdAt.toISOString(),
    updatedAt: bookmark.updatedAt.toISOString(),
  }
}

export const formatHighlight = (highlight: IHighlight | null) => {
  if (!highlight) {
    throw new AppError('Highlight not found.', 404)
  }

  return {
    id: highlight._id.toString(),
    userId: highlight.userId.toString(),
    bookId: highlight.bookId.toString(),
    fileId: highlight.fileId?.toString(),
    startOffset: highlight.startOffset,
    endOffset: highlight.endOffset,
    selectedText: highlight.selectedText,
    color: highlight.color,
    note: highlight.note,
    createdAt: highlight.createdAt.toISOString(),
    updatedAt: highlight.updatedAt.toISOString(),
  }
}

export const getOrCreateProgress = async (
  userId: string,
  bookId: string,
  payload?: {
    currentFileId?: string
    currentPage?: number
  },
) => {
  const existing = await ReadingProgressModel.findOne({ userId, bookId })

  if (existing) {
    existing.lastReadAt = new Date()

    if (payload?.currentFileId) {
      existing.currentFileId = new Types.ObjectId(payload.currentFileId)
    }

    if (typeof payload?.currentPage === 'number') {
      existing.currentPage = payload.currentPage
    }

    await existing.save()
    return existing
  }

  return ReadingProgressModel.create({
    userId: new Types.ObjectId(userId),
    bookId: new Types.ObjectId(bookId),
    currentFileId: payload?.currentFileId
      ? new Types.ObjectId(payload.currentFileId)
      : undefined,
    currentPage: payload?.currentPage,
    progressPercentage: 0,
    status: 'currently-reading',
    startedAt: new Date(),
    lastReadAt: new Date(),
  })
}
