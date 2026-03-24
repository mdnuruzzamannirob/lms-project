export * from './controller'
export * from './interface'
export * from './model'
export { reviewsRouter } from './router'
export * from './service'
export * from './validation'
export * from './utils'

import * as reviewsControllerExports from './controller'
import * as reviewsServiceExports from './service'
import * as reviewsRouterExports from './router'
import * as reviewsValidationExports from './validation'

export const reviewsModule = {
  controller: reviewsControllerExports,
  service: reviewsServiceExports,
  router: reviewsRouterExports,
  validation: reviewsValidationExports,
}
