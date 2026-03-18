import { Router } from 'express'

import { authenticateStaff } from '../../common/middlewares/auth'
import { requirePermission } from '../../common/middlewares/requirePermission'
import { validateRequest } from '../../common/middlewares/validateRequest'
import {
  addBookFile,
  bulkImportBooks,
  createBook,
  deleteBook,
  deleteBookFile,
  getBookPreview,
  getBookReviewSummary,
  getPublicBookById,
  listFeaturedBooks,
  listPublicBooks,
  setBookAvailability,
  setBookFeatured,
  updateBook,
} from './controller'
import { booksValidation } from './validation'

const router = Router()

router.get(
  '/books',
  validateRequest({ query: booksValidation.query }),
  listPublicBooks,
)
router.get('/books/featured', listFeaturedBooks)
router.get(
  '/books/:id',
  validateRequest({ params: booksValidation.idParam }),
  getPublicBookById,
)
router.get(
  '/books/:id/preview',
  validateRequest({ params: booksValidation.idParam }),
  getBookPreview,
)
router.get(
  '/books/:id/reviews',
  validateRequest({ params: booksValidation.idParam }),
  getBookReviewSummary,
)

router.post(
  '/admin/books',
  authenticateStaff,
  requirePermission('books.manage'),
  validateRequest({ body: booksValidation.createBody }),
  createBook,
)
router.post(
  '/admin/books/bulk-import',
  authenticateStaff,
  requirePermission('books.manage'),
  validateRequest({ body: booksValidation.bulkImportBody }),
  bulkImportBooks,
)
router.post(
  '/admin/books/:id/files',
  authenticateStaff,
  requirePermission('books.manage'),
  validateRequest({
    params: booksValidation.idParam,
    body: booksValidation.addFileBody,
  }),
  addBookFile,
)
router.put(
  '/admin/books/:id',
  authenticateStaff,
  requirePermission('books.manage'),
  validateRequest({
    params: booksValidation.idParam,
    body: booksValidation.updateBody,
  }),
  updateBook,
)
router.patch(
  '/admin/books/:id/featured',
  authenticateStaff,
  requirePermission('books.manage'),
  validateRequest({
    params: booksValidation.idParam,
    body: booksValidation.toggleFeaturedBody,
  }),
  setBookFeatured,
)
router.patch(
  '/admin/books/:id/available',
  authenticateStaff,
  requirePermission('books.manage'),
  validateRequest({
    params: booksValidation.idParam,
    body: booksValidation.toggleAvailabilityBody,
  }),
  setBookAvailability,
)
router.delete(
  '/admin/books/:id',
  authenticateStaff,
  requirePermission('books.manage'),
  validateRequest({ params: booksValidation.idParam }),
  deleteBook,
)
router.delete(
  '/admin/books/:id/files/:fid',
  authenticateStaff,
  requirePermission('books.manage'),
  validateRequest({ params: booksValidation.idWithFileParam }),
  deleteBookFile,
)

export const booksRouter = router
