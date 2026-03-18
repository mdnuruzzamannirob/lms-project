import express from 'express'

import { authenticateUser } from '../../common/middlewares/auth'
import { validateRequest } from '../../common/middlewares/validateRequest'
import { searchController } from './controller'
import { searchValidation } from './validation'

const router = express.Router()

// Public routes
router.get(
  '/',
  validateRequest({
    query: searchValidation.searchQuery,
  }),
  searchController.searchBooks,
)

router.get(
  '/suggestions',
  validateRequest({
    query: searchValidation.suggestionsQuery,
  }),
  searchController.getSearchSuggestions,
)

router.get(
  '/popular-terms',
  validateRequest({
    query: searchValidation.popularTermsQuery,
  }),
  searchController.getPopularSearchTerms,
)

// User routes
router.post(
  '/log-click',
  authenticateUser,
  validateRequest({
    body: searchValidation.logClickBody,
  }),
  searchController.logSearchClick,
)

router.get(
  '/history',
  authenticateUser,
  searchController.getSearchHistory,
)

export const searchRouter = router
