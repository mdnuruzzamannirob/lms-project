export * from './controller'
export * from './interface'
export * from './model'
export { readingRouter } from './router'
export * from './service'
export * from './validation'
export * from './utils'

import * as readingControllerExports from './controller'
import * as readingServiceExports from './service'
import * as readingRouterExports from './router'
import * as readingValidationExports from './validation'

export const readingModule = {
  controller: readingControllerExports,
  service: readingServiceExports,
  router: readingRouterExports,
  validation: readingValidationExports,
}
