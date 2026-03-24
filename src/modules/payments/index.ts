export * from './controller'
export * from './gateway.config'
export * from './interface'
export * from './model'
export { paymentsRouter } from './router'
export * from './service'
export * from './validation'
export * from './utils'

import * as paymentsControllerExports from './controller'
import * as paymentsServiceExports from './service'
import * as paymentsRouterExports from './router'
import * as paymentsValidationExports from './validation'

export const paymentsModule = {
  controller: paymentsControllerExports,
  service: paymentsServiceExports,
  router: paymentsRouterExports,
  validation: paymentsValidationExports,
}
