import express from 'express'

import { authenticateUser } from '../../common/middlewares/auth'
import { validateRequest } from '../../common/middlewares/validateRequest'
import { dashboardController } from './controller'
import { dashboardValidation } from './validation'

const router = express.Router()

// User routes
router.get(
  '/',
  authenticateUser,
  validateRequest({
    query: dashboardValidation.homeQuery,
  }),
  dashboardController.getDashboardHome,
)

router.get(
  '/stats',
  authenticateUser,
  validateRequest({
    query: dashboardValidation.statsQuery,
  }),
  dashboardController.getDashboardStats,
)

router.get(
  '/recommendations',
  authenticateUser,
  validateRequest({
    query: dashboardValidation.recommendationsQuery,
  }),
  dashboardController.getRecommendations,
)

router.get(
  '/library',
  authenticateUser,
  validateRequest({
    query: dashboardValidation.libraryQuery,
  }),
  dashboardController.getMyLibrary,
)

export const dashboardRouter = router
