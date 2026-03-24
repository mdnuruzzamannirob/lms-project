import { Router } from 'express'

import { PERMISSIONS } from '../../common/constants/permissions'
import { authenticateStaff } from '../../common/middlewares/auth'
import { requirePermission } from '../../common/middlewares/requirePermission'
import { validateRequest } from '../../common/middlewares/validateRequest'
import { authorsController } from './controller'
import { authorsValidation } from './validation'

const router = Router()

router.get(
  '/',
  validateRequest({ query: authorsValidation.query }),
  authorsController.listAuthors,
)
router.get(
  '/:id',
  validateRequest({ params: authorsValidation.idParam }),
  authorsController.getAuthorById,
)

router.post(
  '/',
  authenticateStaff,
  requirePermission(PERMISSIONS.AUTHORS_MANAGE),
  validateRequest({ body: authorsValidation.createBody }),
  authorsController.createAuthor,
)
router.put(
  '/:id',
  authenticateStaff,
  requirePermission(PERMISSIONS.AUTHORS_MANAGE),
  validateRequest({
    params: authorsValidation.idParam,
    body: authorsValidation.updateBody,
  }),
  authorsController.updateAuthor,
)
router.delete(
  '/:id',
  authenticateStaff,
  requirePermission(PERMISSIONS.AUTHORS_MANAGE),
  validateRequest({ params: authorsValidation.idParam }),
  authorsController.deleteAuthor,
)

export const authorsRouter = router
