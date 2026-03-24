export type { IDashboardRecommendation, IDashboardStats } from './interface'
export { dashboardRouter } from './router'
export { dashboardService } from './service'

import * as dashboardControllerExports from './controller'
import * as dashboardServiceExports from './service'
import * as dashboardRouterExports from './router'
import * as dashboardValidationExports from './validation'

export const dashboardModule = {
  controller: dashboardControllerExports,
  service: dashboardServiceExports,
  router: dashboardRouterExports,
  validation: dashboardValidationExports,
}
