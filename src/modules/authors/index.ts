export * from './controller'
export * from './interface'
export * from './model'
export { authorsRouter } from './router'
export * from './service'
export * from './validation'
export * from './utils'

import * as authorsControllerExports from './controller'
import * as authorsServiceExports from './service'
import * as authorsRouterExports from './router'
import * as authorsValidationExports from './validation'

export const authorsModule = {
  controller: authorsControllerExports,
  service: authorsServiceExports,
  router: authorsRouterExports,
  validation: authorsValidationExports,
}
