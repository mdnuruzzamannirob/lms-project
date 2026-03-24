import { Router } from 'express'

import { authenticateUser } from '../../common/middlewares/auth'
import { checkSubscriptionAccess } from '../../common/middlewares/subscriptionAccess'
import { validateRequest } from '../../common/middlewares/validateRequest'
import { readingController } from './controller'
import { readingValidation } from './validation'

const router = Router()

router.post(
  '/reading/:bookId/start',
  authenticateUser,
  checkSubscriptionAccess,
  validateRequest({
    params: readingValidation.bookParam,
    body: readingValidation.startReadingBody,
  }),
  readingController.startReading,
)
router.post(
  '/reading/:bookId/session',
  authenticateUser,
  checkSubscriptionAccess,
  validateRequest({
    params: readingValidation.bookParam,
    body: readingValidation.createSessionBody,
  }),
  readingController.createReadingSession,
)
router.patch(
  '/reading/:bookId/progress',
  authenticateUser,
  checkSubscriptionAccess,
  validateRequest({
    params: readingValidation.bookParam,
    body: readingValidation.updateProgressBody,
  }),
  readingController.updateReadingProgress,
)

router.get(
  '/reading/history',
  authenticateUser,
  validateRequest({ query: readingValidation.paginationQuery }),
  readingController.getReadingHistory,
)
router.get(
  '/reading/currently-reading',
  authenticateUser,
  validateRequest({ query: readingValidation.paginationQuery }),
  readingController.getCurrentlyReading,
)
router.get(
  '/reading/completed',
  authenticateUser,
  validateRequest({ query: readingValidation.paginationQuery }),
  readingController.getCompletedReading,
)

router.get(
  '/books/:bookId/bookmarks',
  authenticateUser,
  checkSubscriptionAccess,
  validateRequest({ params: readingValidation.bookParam }),
  readingController.listBookmarks,
)
router.post(
  '/books/:bookId/bookmarks',
  authenticateUser,
  checkSubscriptionAccess,
  validateRequest({
    params: readingValidation.bookParam,
    body: readingValidation.createBookmarkBody,
  }),
  readingController.createBookmark,
)
router.patch(
  '/books/:bookId/bookmarks/:id',
  authenticateUser,
  checkSubscriptionAccess,
  validateRequest({
    params: readingValidation.nestedIdParam,
    body: readingValidation.updateBookmarkBody,
  }),
  readingController.updateBookmark,
)
router.delete(
  '/books/:bookId/bookmarks/:id',
  authenticateUser,
  checkSubscriptionAccess,
  validateRequest({ params: readingValidation.nestedIdParam }),
  readingController.deleteBookmark,
)

router.get(
  '/books/:bookId/highlights',
  authenticateUser,
  checkSubscriptionAccess,
  validateRequest({ params: readingValidation.bookParam }),
  readingController.listHighlights,
)
router.post(
  '/books/:bookId/highlights',
  authenticateUser,
  checkSubscriptionAccess,
  validateRequest({
    params: readingValidation.bookParam,
    body: readingValidation.createHighlightBody,
  }),
  readingController.createHighlight,
)
router.patch(
  '/books/:bookId/highlights/:id',
  authenticateUser,
  checkSubscriptionAccess,
  validateRequest({
    params: readingValidation.nestedIdParam,
    body: readingValidation.updateHighlightBody,
  }),
  readingController.updateHighlight,
)
router.delete(
  '/books/:bookId/highlights/:id',
  authenticateUser,
  checkSubscriptionAccess,
  validateRequest({ params: readingValidation.nestedIdParam }),
  readingController.deleteHighlight,
)

export const readingRouter = router
