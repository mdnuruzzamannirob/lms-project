export * from './controller'
export * from './interface'
export * from './model'
export { staffRouter } from './router'
export * from './service'
export * from './validation'
export * from './utils'

import * as staffControllerExports from './controller'
import * as staffServiceExports from './service'
import * as staffRouterExports from './router'
import * as staffValidationExports from './validation'

export const staffModule = {
  controller: staffControllerExports,
  service: staffServiceExports,
  router: staffRouterExports,
  validation: staffValidationExports,
}
