import { Router } from 'express'

import { authenticateStaff } from '../../common/middlewares/auth'
import { requirePermission } from '../../common/middlewares/requirePermission'
import { validateRequest } from '../../common/middlewares/validateRequest'
import {
  createCategory,
  deleteCategory,
  getCategoryById,
  listCategories,
  updateCategory,
} from './controller'
import { categoriesValidation } from './validation'

const router = Router()

router.get(
  '/',
  validateRequest({ query: categoriesValidation.query }),
  listCategories,
)
router.get(
  '/:id',
  validateRequest({ params: categoriesValidation.idParam }),
  getCategoryById,
)

router.post(
  '/',
  authenticateStaff,
  requirePermission('categories.manage'),
  validateRequest({ body: categoriesValidation.createBody }),
  createCategory,
)
router.put(
  '/:id',
  authenticateStaff,
  requirePermission('categories.manage'),
  validateRequest({
    params: categoriesValidation.idParam,
    body: categoriesValidation.updateBody,
  }),
  updateCategory,
)
router.delete(
  '/:id',
  authenticateStaff,
  requirePermission('categories.manage'),
  validateRequest({ params: categoriesValidation.idParam }),
  deleteCategory,
)

export const categoriesRouter = router
