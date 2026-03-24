import { Router } from 'express'

import { PERMISSIONS } from '../../common/constants/permissions'
import {
  authenticateStaff,
  authenticateUser,
} from '../../common/middlewares/auth'
import { requirePermission } from '../../common/middlewares/requirePermission'
import { validateRequest } from '../../common/middlewares/validateRequest'
import { reviewsController } from './controller'
import { reviewsValidation } from './validation'

const router = Router()

router.get(
  '/books/:bookId/reviews',
  validateRequest({
    params: reviewsValidation.bookParam,
    query: reviewsValidation.query,
  }),
  reviewsController.listPublicBookReviews,
)
router.post(
  '/books/:bookId/reviews',
  authenticateUser,
  validateRequest({
    params: reviewsValidation.bookParam,
    body: reviewsValidation.createBody,
  }),
  reviewsController.createReview,
)
router.patch(
  '/books/:bookId/reviews/:id',
  authenticateUser,
  validateRequest({
    params: reviewsValidation.reviewNestedParam,
    body: reviewsValidation.updateBody,
  }),
  reviewsController.updateReview,
)
router.delete(
  '/books/:bookId/reviews/:id',
  authenticateUser,
  validateRequest({ params: reviewsValidation.reviewNestedParam }),
  reviewsController.deleteReview,
)

router.get(
  '/admin/reviews',
  authenticateStaff,
  requirePermission(PERMISSIONS.REVIEWS_VIEW),
  validateRequest({ query: reviewsValidation.query }),
  reviewsController.listReviewsForAdmin,
)
router.patch(
  '/admin/reviews/:id/toggle',
  authenticateStaff,
  requirePermission(PERMISSIONS.REVIEWS_MANAGE),
  validateRequest({
    params: reviewsValidation.idParam,
    body: reviewsValidation.toggleVisibilityBody,
  }),
  reviewsController.toggleReviewVisibility,
)

export const reviewsRouter = router
