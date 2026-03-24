export * from './controller'
export * from './interface'
export * from './model'
export { categoriesRouter } from './router'
export * from './service'
export * from './utils'
export * from './validation'

import * as categoriesControllerExports from './controller'
import * as categoriesRouterExports from './router'
import * as categoriesServiceExports from './service'
import * as categoriesValidationExports from './validation'

export const categoriesModule = {
  controller: categoriesControllerExports,
  service: categoriesServiceExports,
  router: categoriesRouterExports,
  validation: categoriesValidationExports,
}
