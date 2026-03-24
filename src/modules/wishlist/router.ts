import { Router } from 'express'

import { authenticateUser } from '../../common/middlewares/auth'
import { validateRequest } from '../../common/middlewares/validateRequest'
import { wishlistController } from './controller'
import { wishlistValidation } from './validation'

const router = Router()

router.get(
  '/wishlist',
  authenticateUser,
  validateRequest({ query: wishlistValidation.query }),
  wishlistController.getMyWishlist,
)
router.post(
  '/wishlist/:bookId',
  authenticateUser,
  validateRequest({ params: wishlistValidation.bookIdParam }),
  wishlistController.addToWishlist,
)
router.delete(
  '/wishlist/:bookId',
  authenticateUser,
  validateRequest({ params: wishlistValidation.bookIdParam }),
  wishlistController.removeFromWishlist,
)

export const wishlistRouter = router
