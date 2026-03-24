export * from './controller'
export * from './interface'
export * from './model'
export { subscriptionsRouter } from './router'
export * from './service'
export * from './validation'
export * from './utils'

import * as subscriptionsControllerExports from './controller'
import * as subscriptionsServiceExports from './service'
import * as subscriptionsRouterExports from './router'
import * as subscriptionsValidationExports from './validation'

export const subscriptionsModule = {
  controller: subscriptionsControllerExports,
  service: subscriptionsServiceExports,
  router: subscriptionsRouterExports,
  validation: subscriptionsValidationExports,
}
