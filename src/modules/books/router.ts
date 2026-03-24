import { Router } from 'express'

import { PERMISSIONS } from '../../common/constants/permissions'
import { authenticateStaff } from '../../common/middlewares/auth'
import { requirePermission } from '../../common/middlewares/requirePermission'
import { validateRequest } from '../../common/middlewares/validateRequest'
import { booksController } from './controller'
import { booksValidation } from './validation'

const router = Router()

router.get(
  '/books',
  validateRequest({ query: booksValidation.query }),
  booksController.listPublicBooks,
)
router.get('/books/featured', booksController.listFeaturedBooks)
router.get(
  '/books/:id',
  validateRequest({ params: booksValidation.idParam }),
  booksController.getPublicBookById,
)
router.get(
  '/books/:id/preview',
  validateRequest({ params: booksValidation.idParam }),
  booksController.getBookPreview,
)

router.post(
  '/admin/books',
  authenticateStaff,
  requirePermission(PERMISSIONS.BOOKS_MANAGE),
  validateRequest({ body: booksValidation.createBody }),
  booksController.createBook,
)
router.post(
  '/admin/books/bulk-import',
  authenticateStaff,
  requirePermission(PERMISSIONS.BOOKS_MANAGE),
  validateRequest({ body: booksValidation.bulkImportBody }),
  booksController.bulkImportBooks,
)
router.post(
  '/admin/books/:id/files',
  authenticateStaff,
  requirePermission(PERMISSIONS.BOOKS_MANAGE),
  validateRequest({
    params: booksValidation.idParam,
    body: booksValidation.addFileBody,
  }),
  booksController.addBookFile,
)
router.put(
  '/admin/books/:id',
  authenticateStaff,
  requirePermission(PERMISSIONS.BOOKS_MANAGE),
  validateRequest({
    params: booksValidation.idParam,
    body: booksValidation.updateBody,
  }),
  booksController.updateBook,
)
router.patch(
  '/admin/books/:id/featured',
  authenticateStaff,
  requirePermission(PERMISSIONS.BOOKS_MANAGE),
  validateRequest({
    params: booksValidation.idParam,
    body: booksValidation.toggleFeaturedBody,
  }),
  booksController.setBookFeatured,
)
router.patch(
  '/admin/books/:id/status',
  authenticateStaff,
  requirePermission(PERMISSIONS.BOOKS_MANAGE),
  validateRequest({
    params: booksValidation.idParam,
    body: booksValidation.setStatusBody,
  }),
  booksController.setBookStatus,
)
router.patch(
  '/admin/books/:id/availability',
  authenticateStaff,
  requirePermission(PERMISSIONS.BOOKS_MANAGE),
  validateRequest({
    params: booksValidation.idParam,
    body: booksValidation.setAvailabilityBody,
  }),
  booksController.setBookAvailability,
)
router.delete(
  '/admin/books/:id',
  authenticateStaff,
  requirePermission(PERMISSIONS.BOOKS_MANAGE),
  validateRequest({ params: booksValidation.idParam }),
  booksController.deleteBook,
)
router.delete(
  '/admin/books/:id/files/:fid',
  authenticateStaff,
  requirePermission(PERMISSIONS.BOOKS_MANAGE),
  validateRequest({ params: booksValidation.idWithFileParam }),
  booksController.deleteBookFile,
)

export const booksRouter = router
