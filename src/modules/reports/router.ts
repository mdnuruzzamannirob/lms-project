import type { RequestHandler } from 'express'
import express from 'express'

import { authenticateStaff } from '../../common/middlewares/auth'
import { requirePermission } from '../../common/middlewares/requirePermission'
import { validateRequest } from '../../common/middlewares/validateRequest'
import { reportsController } from './controller'
import { reportsValidation } from './validation'

const router = express.Router()

router.post(
  '/',
  authenticateStaff,
  requirePermission('reports.manage'),
  validateRequest({
    body: reportsValidation.createBody,
  }),
  reportsController.createReportJob as RequestHandler,
)

router.get(
  '/',
  authenticateStaff,
  requirePermission('reports.view'),
  validateRequest({
    query: reportsValidation.listQuery,
  }),
  reportsController.listReportJobs as RequestHandler,
)

router.get(
  '/admin-overview',
  authenticateStaff,
  requirePermission('reports.view'),
  reportsController.adminOverviewSnapshot as RequestHandler,
)

router.post(
  '/process',
  authenticateStaff,
  requirePermission('reports.manage'),
  reportsController.processPendingReports as RequestHandler,
)

router.get(
  '/:reportId',
  authenticateStaff,
  requirePermission('reports.view'),
  validateRequest({
    params: reportsValidation.reportIdParam,
  }),
  reportsController.getReportJob as RequestHandler,
)

router.get(
  '/:reportId/download',
  authenticateStaff,
  requirePermission('reports.view'),
  validateRequest({
    params: reportsValidation.reportIdParam,
  }),
  reportsController.downloadReport as RequestHandler,
)

export const reportsRouter = router
