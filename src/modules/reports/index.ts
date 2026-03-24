export * from './aggregation.service'
export * from './controller'
export * from './interface'
export * from './model'
export { reportsRouter } from './router'
export * from './service'
export * from './validation'
export * from './utils'

import * as reportsControllerExports from './controller'
import * as reportsServiceExports from './service'
import * as reportsRouterExports from './router'
import * as reportsValidationExports from './validation'

export const reportsModule = {
  controller: reportsControllerExports,
  service: reportsServiceExports,
  router: reportsRouterExports,
  validation: reportsValidationExports,
}
