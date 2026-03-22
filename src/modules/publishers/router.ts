import { Router } from 'express'
import { PERMISSIONS } from '../../common/constants/permissions'
import { authenticateStaff } from '../../common/middlewares/auth'
import { requirePermission } from '../../common/middlewares/requirePermission'
import { validateRequest } from '../../common/middlewares/validateRequest'
import { publishersController } from './controller'
import { publishersValidation } from './validation'

const router = Router()

router.get(
  '/',
  validateRequest({ query: publishersValidation.query }),
  publishersController.listPublishers,
)
router.get(
  '/:id',
  validateRequest({ params: publishersValidation.idParam }),
  publishersController.getPublisher,
)

router.post(
  '/',
  authenticateStaff,
  requirePermission(PERMISSIONS.PUBLISHERS_MANAGE),
  validateRequest({ body: publishersValidation.createBody }),
  publishersController.createPublisher,
)

router.patch(
  '/:id',
  authenticateStaff,
  requirePermission(PERMISSIONS.PUBLISHERS_MANAGE),
  validateRequest({
    params: publishersValidation.idParam,
    body: publishersValidation.updateBody,
  }),
  publishersController.updatePublisher,
)

router.delete(
  '/:id',
  authenticateStaff,
  requirePermission(PERMISSIONS.PUBLISHERS_MANAGE),
  validateRequest({ params: publishersValidation.idParam }),
  publishersController.deletePublisher,
)

export const publishersRouter = router
