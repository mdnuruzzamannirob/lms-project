export * from './controller'
export * from './interface'
export * from './model'
export { auditRouter } from './router'
export * from './service'
export * from './validation'
export * from './utils'

import * as auditControllerExports from './controller'
import * as auditServiceExports from './service'
import * as auditRouterExports from './router'
import * as auditValidationExports from './validation'

export const auditModule = {
  controller: auditControllerExports,
  service: auditServiceExports,
  router: auditRouterExports,
  validation: auditValidationExports,
}
