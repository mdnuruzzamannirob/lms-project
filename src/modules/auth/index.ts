export * from './constants'
export * from './controller'
export * from './emailOtp.model'
export * from './interface'
export * from './model'
export { authRouter } from './router'
export * from './service'
export * from './utils'
export * from './validation'

import * as authControllerExports from './controller'
import * as authServiceExports from './service'
import * as authRouterExports from './router'
import * as authValidationExports from './validation'

export const authModule = {
  controller: authControllerExports,
  service: authServiceExports,
  router: authRouterExports,
  validation: authValidationExports,
}
