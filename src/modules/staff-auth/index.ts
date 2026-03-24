export * from './controller'
export * from './interface'
export * from './model'
export { staffAuthRouter } from './router'
export * from './service'
export * from './validation'
export * from './utils'

import * as staffAuthControllerExports from './controller'
import * as staffAuthServiceExports from './service'
import * as staffAuthRouterExports from './router'
import * as staffAuthValidationExports from './validation'

export const staffAuthModule = {
  controller: staffAuthControllerExports,
  service: staffAuthServiceExports,
  router: staffAuthRouterExports,
  validation: staffAuthValidationExports,
}
