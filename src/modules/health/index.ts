export * from './controller'
export * from './interface'
export * from './model'
export { healthRouter } from './router'
export * from './service'
export * from './validation'

import * as healthControllerExports from './controller'
import * as healthServiceExports from './service'
import * as healthRouterExports from './router'
import * as healthValidationExports from './validation'

export const healthModule = {
  controller: healthControllerExports,
  service: healthServiceExports,
  router: healthRouterExports,
  validation: healthValidationExports,
}
