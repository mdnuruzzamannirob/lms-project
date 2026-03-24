export * from './controller'
export * from './interface'
export * from './model'
export { promotionsRouter } from './router'
export * from './service'
export * from './validation'

import * as promotionsControllerExports from './controller'
import * as promotionsServiceExports from './service'
import * as promotionsRouterExports from './router'
import * as promotionsValidationExports from './validation'

export const promotionsModule = {
  controller: promotionsControllerExports,
  service: promotionsServiceExports,
  router: promotionsRouterExports,
  validation: promotionsValidationExports,
}
export * from './utils'
