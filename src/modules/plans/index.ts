export * from './controller'
export * from './interface'
export * from './model'
export { plansRouter } from './router'
export * from './service'
export * from './validation'
export * from './utils'

import * as plansControllerExports from './controller'
import * as plansServiceExports from './service'
import * as plansRouterExports from './router'
import * as plansValidationExports from './validation'

export const plansModule = {
  controller: plansControllerExports,
  service: plansServiceExports,
  router: plansRouterExports,
  validation: plansValidationExports,
}
