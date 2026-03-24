export * from './controller'
export * from './interface'
export * from './model'
export { rbacRouter } from './router'
export * from './service'
export * from './validation'

import * as rbacControllerExports from './controller'
import * as rbacServiceExports from './service'
import * as rbacRouterExports from './router'
import * as rbacValidationExports from './validation'

export const rbacModule = {
  controller: rbacControllerExports,
  service: rbacServiceExports,
  router: rbacRouterExports,
  validation: rbacValidationExports,
}
export * from './utils'
