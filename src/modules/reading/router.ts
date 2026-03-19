import { Router } from 'express'

import { authenticateUser } from '../../common/middlewares/auth'
import { validateRequest } from '../../common/middlewares/validateRequest'
import {
  createBookmark,
  createHighlight,
  createReadingSession,
  deleteBookmark,
  deleteHighlight,
  getCompletedReading,
  getCurrentlyReading,
  getReadingHistory,
  listBookmarks,
  listHighlights,
  startReading,
  updateBookmark,
  updateHighlight,
  updateReadingProgress,
} from './controller'
import { readingValidation } from './validation'

const router = Router()

router.post(
  '/reading/:bookId/start',
  authenticateUser,
  validateRequest({
    params: readingValidation.bookParam,
    body: readingValidation.startReadingBody,
  }),
  startReading,
)
router.post(
  '/reading/:bookId/session',
  authenticateUser,
  validateRequest({
    params: readingValidation.bookParam,
    body: readingValidation.createSessionBody,
  }),
  createReadingSession,
)
router.patch(
  '/reading/:bookId/progress',
  authenticateUser,
  validateRequest({
    params: readingValidation.bookParam,
    body: readingValidation.updateProgressBody,
  }),
  updateReadingProgress,
)

router.get(
  '/reading/history',
  authenticateUser,
  validateRequest({ query: readingValidation.paginationQuery }),
  getReadingHistory,
)
router.get(
  '/reading/currently-reading',
  authenticateUser,
  validateRequest({ query: readingValidation.paginationQuery }),
  getCurrentlyReading,
)
router.get(
  '/reading/completed',
  authenticateUser,
  validateRequest({ query: readingValidation.paginationQuery }),
  getCompletedReading,
)

router.get(
  '/books/:bookId/bookmarks',
  authenticateUser,
  validateRequest({ params: readingValidation.bookParam }),
  listBookmarks,
)
router.post(
  '/books/:bookId/bookmarks',
  authenticateUser,
  validateRequest({
    params: readingValidation.bookParam,
    body: readingValidation.createBookmarkBody,
  }),
  createBookmark,
)
router.patch(
  '/books/:bookId/bookmarks/:id',
  authenticateUser,
  validateRequest({
    params: readingValidation.nestedIdParam,
    body: readingValidation.updateBookmarkBody,
  }),
  updateBookmark,
)
router.delete(
  '/books/:bookId/bookmarks/:id',
  authenticateUser,
  validateRequest({ params: readingValidation.nestedIdParam }),
  deleteBookmark,
)

router.get(
  '/books/:bookId/highlights',
  authenticateUser,
  validateRequest({ params: readingValidation.bookParam }),
  listHighlights,
)
router.post(
  '/books/:bookId/highlights',
  authenticateUser,
  validateRequest({
    params: readingValidation.bookParam,
    body: readingValidation.createHighlightBody,
  }),
  createHighlight,
)
router.patch(
  '/books/:bookId/highlights/:id',
  authenticateUser,
  validateRequest({
    params: readingValidation.nestedIdParam,
    body: readingValidation.updateHighlightBody,
  }),
  updateHighlight,
)
router.delete(
  '/books/:bookId/highlights/:id',
  authenticateUser,
  validateRequest({ params: readingValidation.nestedIdParam }),
  deleteHighlight,
)

export const readingRouter = router
